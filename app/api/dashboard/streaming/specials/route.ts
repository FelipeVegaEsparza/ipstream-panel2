// =====================================================
// /api/dashboard/streaming/specials — listar y crear especiales
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess } from '@/lib/ai-live'
import { isDeepSeekConfigured } from '@/lib/deepseek'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'
import {
  findSpecialCollision,
  getClientStationName,
  getClientTimezone,
  isDateString,
  todayInTimezone,
} from '@/lib/specials'
import {
  SPECIAL_INCLUDE,
  serializeSpecial,
  validateTrackIds,
  type SpecialWithTracks,
} from '@/lib/specials-service'

export const dynamic = 'force-dynamic'

const MAX_TEXT = 1200
const MAX_DESCRIPTION = 2000

function bad(message: string, code = 'validation_error', status = 400) {
  return NextResponse.json({ error: code, message }, { status })
}

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const [specials, access, aiConfigured, ttsConfigured, station, timezone] = await Promise.all([
      prisma.radioSpecial.findMany({
        where: { clientId: ctx.clientId },
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
        include: SPECIAL_INCLUDE,
      }),
      getAiLiveAccess(ctx.clientId),
      isDeepSeekConfigured(),
      hasConfiguredPremiumTts(),
      getClientStationName(ctx.clientId),
      getClientTimezone(ctx.clientId),
    ])

    return NextResponse.json({
      specials: specials.map((special) => serializeSpecial(special as SpecialWithTracks, todayInTimezone(timezone))),
      aiEnabled: access.enabled,
      aiAvailable: access.enabled && aiConfigured,
      ttsAvailable: access.enabled && ttsConfigured,
      remaining: access.remaining,
      limit: access.limit,
      stationName: station,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : ''
    const artist = typeof body?.artist === 'string' ? body.artist.trim().slice(0, 200) : ''
    const description = typeof body?.description === 'string'
      ? body.description.trim().slice(0, MAX_DESCRIPTION)
      : ''
    const introRaw = typeof body?.introText === 'string' ? body.introText.trim().slice(0, MAX_TEXT) : ''
    const closingRaw = typeof body?.closingText === 'string' ? body.closingText.trim().slice(0, MAX_TEXT) : ''
    const introText = introRaw
    const closingText = closingRaw
    const everyTracks = Number(body?.everyTracks)
    const startDate = typeof body?.startDate === 'string' && body.startDate.trim() ? body.startDate.trim() : null
    const endDate = typeof body?.endDate === 'string' && body.endDate.trim() ? body.endDate.trim() : null
    const active = body?.active === undefined ? true : Boolean(body.active)
    const trackIds = Array.isArray(body?.trackIds)
      ? body.trackIds.filter((value: unknown): value is string => typeof value === 'string')
      : []

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
    if (!validTracks) return bad(`Elegí hasta 5 temas válidos, sin repetir.`)

    if (active) {
      const conflicts = await findSpecialCollision({
        clientId: ctx.clientId,
        everyTracks,
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

    const special = await prisma.radioSpecial.create({
      data: {
        clientId: ctx.clientId,
        name,
        artist: artist || null,
        description,
        introText,
        closingText,
        everyTracks,
        startDate,
        endDate,
        active,
        tracks: {
          create: validTracks.map((trackId, order) => ({ trackId, order })),
        },
      },
      include: SPECIAL_INCLUDE,
    })

    return NextResponse.json({ ok: true, special: serializeSpecial(special) })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
