// =====================================================
// /api/dashboard/streaming/ai/autodj
// Presentador IA del AutoDJ: prepara las locuciones de una playlist (por
// defecto la activa) en su propio set, sin borrar las de las demás.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { StreamingAgentError } from '@/lib/streaming-client'
import { prisma } from '@/lib/prisma'
import {
  AiAutodjError,
  cleanupLegacyAiJingles,
  preparePlaylistIntros,
} from '@/lib/ai-autodj'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    let playlistId =
      typeof body?.playlistId === 'string' && body.playlistId ? body.playlistId : null
    const every = body?.every === undefined ? undefined : Number(body.every)

    // Resolver la activa acá unifica el lock de generación con el poller.
    if (!playlistId) {
      const active = await prisma.playlist.findFirst({
        where: { clientId: ctx.clientId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
      playlistId = active?.id ?? null
    }
    if (!playlistId) {
      return NextResponse.json(
        { error: 'no_playlist', message: 'No hay una playlist activa con temas.' },
        { status: 400 }
      )
    }

    await cleanupLegacyAiJingles(ctx.clientId)

    const result = await preparePlaylistIntros({
      clientId: ctx.clientId,
      playlistId,
      every,
      force: true,
    })

    return NextResponse.json({
      ok: true,
      generated: result.generated,
      every: result.every,
      totalCharacters: result.totalCharacters,
      remaining: result.remaining,
      playlistTracks: result.playlistTracks,
      playlistId: result.playlistId,
      playlistName: result.playlistName,
      message: `AutoDJ preparado: ${result.generated} intros antes de sus temas.`,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof AiAutodjError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status }
      )
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[ai/autodj]', err)
    return NextResponse.json(
      { error: 'internal_error', message: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
