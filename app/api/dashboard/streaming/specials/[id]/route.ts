// =====================================================
// /api/dashboard/streaming/specials/:id — editar/eliminar un especial
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { streamingClient } from '@/lib/streaming-client'
import { generateAndUploadSpecialAudio } from '@/lib/specials-audio'
import {
  findSpecialCollision,
  isDateString,
} from '@/lib/specials'
import {
  SPECIAL_INCLUDE,
  replaceSpecialTracks,
  serializeSpecial,
  validateTrackIds,
  type SpecialWithTracks,
} from '@/lib/specials-service'

export const dynamic = 'force-dynamic'

const MAX_TEXT = 1200
const MAX_DESCRIPTION = 2000

function bad(message: string, status = 400) {
  return NextResponse.json({ error: 'validation_error', message }, { status })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const existing = await prisma.radioSpecial.findFirst({
      where: { id: params.id, clientId: ctx.clientId },
      include: SPECIAL_INCLUDE,
    })
    if (!existing) return NextResponse.json({ error: 'special_not_found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))

    const name = body?.name !== undefined
      ? (typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '')
      : existing.name
    const artist = body?.artist !== undefined
      ? (typeof body.artist === 'string' ? body.artist.trim().slice(0, 200) : '')
      : (existing.artist || '')
    const description = body?.description !== undefined
      ? (typeof body.description === 'string' ? body.description.trim().slice(0, MAX_DESCRIPTION) : '')
      : existing.description
    const introRaw = body?.introText !== undefined
      ? (typeof body.introText === 'string' ? body.introText.trim().slice(0, MAX_TEXT) : '')
      : existing.introText
    const closingRaw = body?.closingText !== undefined
      ? (typeof body.closingText === 'string' ? body.closingText.trim().slice(0, MAX_TEXT) : '')
      : existing.closingText
    const introText = introRaw
    const closingText = closingRaw
    const everyTracks = body?.everyTracks !== undefined ? Number(body.everyTracks) : existing.everyTracks
    const startDate = body?.startDate !== undefined
      ? (typeof body.startDate === 'string' && body.startDate.trim() ? body.startDate.trim() : null)
      : existing.startDate
    const endDate = body?.endDate !== undefined
      ? (typeof body.endDate === 'string' && body.endDate.trim() ? body.endDate.trim() : null)
      : existing.endDate
    const active = body?.active !== undefined ? Boolean(body.active) : existing.active
    const trackIds = body?.trackIds !== undefined
      ? (Array.isArray(body.trackIds)
          ? body.trackIds.filter((value: unknown): value is string => typeof value === 'string')
          : [])
      : existing.tracks.map((entry) => entry.trackId)

    if (!name) return bad('Poné un nombre para el especial.')
    if (!description) return bad('Escribí una descripción del especial.')
    if (!Number.isInteger(everyTracks) || everyTracks < 2 || everyTracks > 50) {
      return bad('La frecuencia debe ser un entero entre 2 y 50 temas.')
    }
    if (startDate && !isDateString(startDate)) return bad('La fecha de inicio no es válida.')
    if (endDate && !isDateString(endDate)) return bad('La fecha de fin no es válida.')
    if (startDate && endDate && startDate > endDate) {
      return bad('La fecha de inicio no puede ser posterior a la de fin.')
    }
    const validTracks = await validateTrackIds(ctx.clientId, trackIds)
    if (!validTracks) return bad('Elegí hasta 5 temas válidos, sin repetir.')

    if (active) {
      const conflicts = await findSpecialCollision({
        clientId: ctx.clientId,
        everyTracks,
        excludeId: existing.id,
        startDate,
        endDate,
      })
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'special_collision',
            message: `La frecuencia choca con el especial “${conflicts[0].name}” en el tema ${conflicts[0].position}.`,
            conflicts,
          },
          { status: 409 }
        )
      }
    }

    const introChanged = introText !== existing.introText
    const closingChanged = closingText !== existing.closingText
    const regenerateAudio = body?.regenerateAudio !== false

    await prisma.radioSpecial.update({
      where: { id: existing.id },
      data: {
        name,
        artist: artist || null,
        description,
        introText,
        closingText,
        everyTracks,
        startDate,
        endDate,
        active,
        ...(introChanged ? { introReadyAt: null } : {}),
        ...(closingChanged ? { closingReadyAt: null } : {}),
      },
    })
    if (body?.trackIds !== undefined) {
      await replaceSpecialTracks(existing.id, validTracks)
    }

    // Si el texto cambió y ese audio ya existía, lo regeneramos con los
    // cambios para que no quede desincronizado.
    const audioWarnings: Array<{ part: 'intro' | 'closing'; message: string }> = []
    if (regenerateAudio && introChanged && existing.introReadyAt) {
      const result = await generateAndUploadSpecialAudio({
        clientId: ctx.clientId,
        specialId: existing.id,
        part: 'intro',
        text: introText,
      })
      if (!result.ok) audioWarnings.push({ part: 'intro', message: result.message })
    }
    if (regenerateAudio && closingChanged && existing.closingReadyAt) {
      const result = await generateAndUploadSpecialAudio({
        clientId: ctx.clientId,
        specialId: existing.id,
        part: 'closing',
        text: closingText,
      })
      if (!result.ok) audioWarnings.push({ part: 'closing', message: result.message })
    }

    const activeChanged = body?.active !== undefined && active !== existing.active
    if (activeChanged) {
      try {
        await streamingClient.regenerateM3u(ctx.clientId)
        await streamingClient.restart(ctx.clientId)
      } catch (err) {
        console.warn('[specials PATCH] no se pudo reflejar el estado en el AutoDJ', err)
      }
    }

    const updated = await prisma.radioSpecial.findUnique({
      where: { id: existing.id },
      include: SPECIAL_INCLUDE,
    })
    return NextResponse.json({
      ok: true,
      special: updated ? serializeSpecial(updated as SpecialWithTracks) : null,
      audioWarnings,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const existing = await prisma.radioSpecial.findFirst({
      where: { id: params.id, clientId: ctx.clientId },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'special_not_found' }, { status: 404 })

    await prisma.radioSpecial.delete({ where: { id: existing.id } })
    try {
      await streamingClient.clearSpecialAudio(ctx.clientId, existing.id)
    } catch (err) {
      console.warn('[specials DELETE] no se pudo limpiar el audio del agente', err)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
