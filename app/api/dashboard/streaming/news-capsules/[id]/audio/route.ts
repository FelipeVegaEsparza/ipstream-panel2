import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { generateNewsCapsuleAudio } from '@/lib/news-capsules/audio'
import { streamingClient } from '@/lib/streaming-client'
import { estimateScriptCharacters, type NewsScript } from '@/lib/news-capsules/script'
import {
  deleteCapsuleAudio,
  getClientTimezone,
  loadCapsuleForClient,
  resolveMusicBuffer,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule || capsule.status === 'deleted') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const script: NewsScript = {
      summary: capsule.summary || '',
      intro: capsule.scriptIntro || '',
      body: capsule.scriptBody || '',
      closing: capsule.scriptClosing || '',
    }
    if (!script.intro || !script.body || !script.closing) {
      return NextResponse.json(
        { error: 'script_required', message: 'Generá o escribí el guion antes del audio.' },
        { status: 400 }
      )
    }

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json({ error: 'ai_not_included', message: 'Tu plan no incluye IA.' }, { status: 403 })
    }
    const estimated = estimateScriptCharacters(script)
    if (estimated > access.remaining) {
      return NextResponse.json(
        {
          error: 'ai_quota_exceeded',
          message: `Te quedan ${access.remaining} caracteres y la cápsula necesita ${estimated}.`,
        },
        { status: 402 }
      )
    }

    const music = await resolveMusicBuffer(ctx.clientId, capsule.musicTrackId)
    const generated = await generateNewsCapsuleAudio({
      clientId: ctx.clientId,
      script,
      music: music?.buffer || null,
    })
    if (!generated.ttsCached) {
      await consumeAiCharacters(ctx.clientId, generated.ttsCharacters, 'news-capsule').catch(() => {})
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'news-capsules')
    await fs.mkdir(dir, { recursive: true })
    const storedName = `${crypto.randomUUID()}.mp3`
    const filePath = path.join(dir, storedName)
    await fs.writeFile(filePath, generated.audio)
    try {
      await streamingClient.uploadNewsCapsuleAudio(ctx.clientId, capsule.id, generated.audio)
    } catch (err) {
      console.warn('[news-capsules/audio] no se pudo subir al agente:', err instanceof Error ? err.message : err)
    }
    await deleteCapsuleAudio(capsule.audioUrl)

    await prisma.newsCapsule.update({
      where: { id: capsule.id },
      data: {
        audioUrl: `/api/uploads/news-capsules/${storedName}`,
        audioDuration: Math.round(generated.duration),
        audioVersion: { increment: 1 },
        status: 'draft',
        approvedAt: null,
        previewedAt: null,
        errorMessage: null,
      },
    })

    const updated = await loadCapsuleForClient(capsule.id, ctx.clientId)
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({
      capsule: serializeCapsule(updated, { timezone: await getClientTimezone(ctx.clientId) }),
      remaining: Math.max(0, access.remaining - (generated.ttsCached ? 0 : generated.ttsCharacters)),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/audio]', err)
    const message = err instanceof Error ? err.message : 'No se pudo generar el audio.'
    try {
      await prisma.newsCapsule.update({
        where: { id: params.id },
        data: { status: 'error', errorMessage: message },
      })
    } catch {}
    return NextResponse.json({ error: 'audio_failed', message }, { status: 502 })
  }
}
