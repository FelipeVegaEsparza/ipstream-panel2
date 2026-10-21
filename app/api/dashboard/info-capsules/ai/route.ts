import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { getTtsProvider } from '@/lib/tts-provider'
import { getClientVoiceSettings } from '@/lib/elevenlabs-voices'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const execFileAsync = promisify(execFile)
const MAX_TEXT = 1000

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [access, provider, voice] = await Promise.all([
      getAiLiveAccess(ctx.clientId),
      getTtsProvider(),
      getClientVoiceSettings(ctx.clientId),
    ])
    const fish = provider === 'fish' ? await getFishAudioConfig() : null
    return NextResponse.json({
      ttsEnabled: access.enabled,
      ttsRemaining: access.remaining,
      provider,
      voiceName: provider === 'fish'
        ? (fish?.referenceId ? 'Fish Audio' : 'Fish Audio (voz predeterminada)')
        : voice.name,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 191) : ''
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
    if (!text) return NextResponse.json({ error: 'text_required', message: 'Escribí el texto de la cápsula.' }, { status: 400 })

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json({ error: 'ai_not_included', message: 'Tu plan no incluye IA en vivo.' }, { status: 403 })
    }
    if (text.length > access.remaining) {
      return NextResponse.json(
        { error: 'ai_quota_exceeded', message: `Te quedan ${access.remaining} caracteres de IA.` },
        { status: 402 }
      )
    }

    const tts = await synthesizePremiumTts({ clientId: ctx.clientId, text })
    if (!tts.cached) {
      await consumeAiCharacters(ctx.clientId, text.length).catch(() => {})
    }

    const storedName = `${crypto.randomUUID()}.mp3`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'info-capsules')
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, storedName)
    await fs.writeFile(filePath, tts.audio)

    let duration: number | null = null
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
      ], { timeout: 15_000 })
      const seconds = Number(String(stdout).trim())
      if (Number.isFinite(seconds) && seconds > 0) duration = Math.round(seconds)
    } catch {}

    const capsule = await prisma.infoCapsule.create({
      data: {
        clientId: ctx.clientId,
        source: 'ai',
        title: title || 'Cápsula IA',
        description: 'Cápsula informativa creada con IA.',
        fileName: `capsula-ia-${Date.now()}.mp3`,
        mimeType: 'audio/mpeg',
        url: `/api/uploads/info-capsules/${storedName}`,
        size: tts.audio.length,
        duration,
        active: true,
      },
      select: {
        id: true, title: true, description: true, url: true,
        duration: true, source: true, clientId: true, createdAt: true,
      },
    }).catch(async (err) => {
      await fs.unlink(filePath).catch(() => {})
      throw err
    })

    return NextResponse.json({
      capsule,
      provider: tts.provider,
      cached: tts.cached,
      remaining: access.remaining - (tts.cached ? 0 : text.length),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    console.error('[info-capsules/ai POST]', err)
    return NextResponse.json(
      { error: 'tts_failed', message: err instanceof Error ? err.message : 'No se pudo generar la cápsula.' },
      { status: 502 }
    )
  }
}
