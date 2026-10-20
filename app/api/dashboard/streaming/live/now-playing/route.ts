// =====================================================
// /api/dashboard/streaming/live/now-playing
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { liveAgentRequest, LiveAgentError } from '@/lib/live-agent'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 300) : null
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id_required' }, { status: 400 })
    }

    const payload = {
      sessionId,
      clientId: ctx.clientId,
      title: clean(body?.title),
      artist: clean(body?.artist),
      nextTitle: clean(body?.nextTitle),
      nextArtist: clean(body?.nextArtist),
      nextCoverUrl: clean(body?.nextCoverUrl),
      coverUrl: clean(body?.coverUrl),
    }

    // La PWA lee el now-playing público desde radio_streams. Escribimos aquí
    // también para que título/artista/portada se actualicen aunque el nodo
    // todavía no tenga el agente nuevo (Actualizar nodo).
    await prisma.radioStream.updateMany({
      where: { clientId: ctx.clientId },
      data: {
        currentTitle: payload.title,
        currentArtist: payload.artist,
        currentCoverUrl: payload.coverUrl,
        currentNextTitle: payload.nextTitle,
        currentNextArtist: payload.nextArtist,
        currentNextCoverUrl: payload.nextCoverUrl,
      },
    }).catch((err) => console.error('[live/now-playing] db update', err))

    const result = await liveAgentRequest<{ ok: boolean }>(
      ctx.clientId,
      '/api/live/session/now-playing',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof LiveAgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[live/now-playing]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
