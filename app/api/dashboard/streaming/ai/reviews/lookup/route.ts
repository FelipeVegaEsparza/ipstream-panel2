// =====================================================
// /api/dashboard/streaming/ai/reviews/lookup
// Banco de reseñas para la consola en vivo: recibe artista + título
// (los temas locales no tienen id de base) y devuelve el texto listo.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import {
  buildReviewSpeech,
  buildStationBreak,
  getArtistReviewRecord,
  getClientReviewConfig,
  getClientStationName,
  getOrCreateArtistReview,
  getOrCreateReview,
  getReviewRecord,
  isUsableArtist,
  isUsableTrackMetadata,
  type ReviewRecord,
} from '@/lib/ai-reviews'
import { isDeepSeekConfigured } from '@/lib/deepseek'

export const dynamic = 'force-dynamic'

function toDto(review: ReviewRecord, station: string) {
  return {
    id: review.id,
    kind: review.kind,
    artist: review.artist,
    title: review.title,
    style: review.style,
    text: buildReviewSpeech(station, review.text),
  }
}

function stationBreakDto(station: string, seed: string, style: string) {
  return {
    id: 'station-break',
    kind: 'station',
    artist: '',
    title: '',
    style,
    text: buildReviewSpeech(station, buildStationBreak(seed)),
  }
}

function unavailable(reason: string) {
  return NextResponse.json({ available: false, reason })
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const config = await getClientReviewConfig(ctx.clientId)
    if (!config || !config.adminEnabled) return unavailable('reviews_disabled_by_admin')
    if (config.everyTracks <= 0) return unavailable('reviews_disabled')

    const body = await request.json().catch(() => ({}))
    const artist = typeof body?.artist === 'string' ? body.artist.trim() : ''
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const seed = typeof body?.seed === 'string' ? body.seed.trim().slice(0, 191) : ''

    if (!(await isDeepSeekConfigured())) return unavailable('ai_unavailable')

    const station = await getClientStationName(ctx.clientId)

    if (!isUsableTrackMetadata(artist, title)) {
      // Metadatos poco confiables: si hay artista, bio corta; si no, pausa
      // de emisora. Nunca se inventa un dato sobre un tema no identificado.
      if (isUsableArtist(artist)) {
        const existingArtist = await getArtistReviewRecord({
          clientId: ctx.clientId,
          artist,
          style: config.style,
        })
        if (existingArtist && !existingArtist.active) return unavailable('review_disabled')
        const artistReview = existingArtist ?? await getOrCreateArtistReview({
          clientId: ctx.clientId,
          artist,
          style: config.style,
          hasIntro: true,
        })
        if (artistReview) {
          return NextResponse.json({
            available: true,
            review: toDto(artistReview, station),
          })
        }
      }
      return NextResponse.json({
        available: true,
        review: stationBreakDto(station, seed || `${artist}-${title}`, config.style),
      })
    }

    // Si la reseña ya existe pero el cliente la desactivó, no se emite
    // (tampoco se cae al respaldo del artista).
    const existing = await getReviewRecord({
      clientId: ctx.clientId,
      artist,
      title,
      style: config.style,
    })
    if (existing) {
      if (!existing.active) return unavailable('review_disabled')
      return NextResponse.json({ available: true, review: toDto(existing, station) })
    }

    const trackReview = await getOrCreateReview({
      clientId: ctx.clientId,
      artist,
      title,
      style: config.style,
      hasIntro: true,
    })
    if (trackReview) {
      return NextResponse.json({ available: true, review: toDto(trackReview, station) })
    }

    const existingArtist = await getArtistReviewRecord({
      clientId: ctx.clientId,
      artist,
      style: config.style,
    })
    if (existingArtist && !existingArtist.active) return unavailable('review_disabled')

    const artistReview = await getOrCreateArtistReview({
      clientId: ctx.clientId,
      artist,
      style: config.style,
      hasIntro: true,
    })
    if (artistReview) {
      return NextResponse.json({ available: true, review: toDto(artistReview, station) })
    }

    return unavailable('not_generated')
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/reviews lookup]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
