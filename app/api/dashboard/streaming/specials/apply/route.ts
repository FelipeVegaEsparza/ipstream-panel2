// =====================================================
// /api/dashboard/streaming/specials/apply
// Valida choques, reconstruye el m3u y reinicia el AutoDJ.
// =====================================================

import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { findSpecialCollision, type SpecialCollision } from '@/lib/specials'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const specials = await prisma.radioSpecial.findMany({
      where: { clientId: ctx.clientId, active: true },
      select: {
        id: true,
        name: true,
        everyTracks: true,
        startDate: true,
        endDate: true,
        introReadyAt: true,
        closingReadyAt: true,
        _count: { select: { tracks: true } },
      },
    })

    const conflicts: SpecialCollision[] = []
    for (const special of specials) {
      const found = await findSpecialCollision({
        clientId: ctx.clientId,
        everyTracks: special.everyTracks,
        excludeId: special.id,
        startDate: special.startDate,
        endDate: special.endDate,
      })
      for (const conflict of found) {
        if (!conflicts.some((item) => item.id === conflict.id)) conflicts.push(conflict)
      }
    }
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'special_collision',
          message: `Hay especiales que chocan en la misma posición: “${conflicts[0].name}”.`,
          conflicts,
        },
        { status: 409 }
      )
    }

    const localSkipped = specials
      .filter((special) =>
        special._count.tracks === 0 ||
        !special.introReadyAt ||
        !special.closingReadyAt
      )
      .map((special) => ({
        id: special.id,
        name: special.name,
        reason: special._count.tracks === 0
          ? 'no_tracks'
          : 'audio_missing',
      }))

    const result = await streamingClient.regenerateM3u(ctx.clientId)
    await streamingClient.restart(ctx.clientId)

    const agentSkipped = Array.isArray(result?.specialsSkipped) ? result.specialsSkipped : []
    const skipped = agentSkipped.length > 0 ? agentSkipped : localSkipped
    const applied = Array.isArray(result?.specialsApplied) ? result.specialsApplied : []
    const agentOutdated = specials.length > 0 && !Array.isArray(result?.specialsApplied)

    return NextResponse.json({
      ok: true,
      applied,
      skipped,
      agentOutdated,
      trackCount: result?.trackCount ?? 0,
      message: agentOutdated
        ? 'El AutoDJ se actualizó, pero este nodo todavía no soporta Especiales. Pulsá “Actualizar nodo” y volvé a aplicar.'
        : skipped.length > 0
          ? `AutoDJ actualizado. ${applied.length} especial(es) al aire y ${skipped.length} omitido(s).`
          : `AutoDJ actualizado. ${applied.length} especial(es) al aire.`,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[specials apply]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
