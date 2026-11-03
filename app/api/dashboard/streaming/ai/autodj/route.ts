// =====================================================
// /api/dashboard/streaming/ai/autodj
// Presentador IA del AutoDJ en una fuente separada de los jingles.
// Genera una intro y una reseña por bloque, las sube al agente y
// actualiza las frecuencias.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { synthesizePremiumTts, hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { buildPresenterText, normalizePhrases } from '@/lib/live-console/presenter'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'
import {
  DEFAULT_REVIEW_STYLE,
  buildReviewSpeech,
  buildStationBreak,
  getArtistReviewRecord,
  getOrCreateArtistReview,
  getOrCreateReview,
  getReviewRecord,
  isReviewStyle,
  isUsableArtist,
  isUsableTrackMetadata,
  synthesizeReviewWithLimit,
  type ReviewRecord,
} from '@/lib/ai-reviews'

export const dynamic = 'force-dynamic'

const MAX_INTROS = 80
const MAX_REVIEWS = 80
const AI_JINGLE_ARTIST = 'Locutor IA'

function parsePhrases(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

function reviewFileName(index: number, trackId: string): string {
  return `rv-${String(index + 1).padStart(4, '0')}-${trackId}.mp3`
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json(
        { error: 'ai_not_included', message: 'Tu plan no incluye IA en vivo.' },
        { status: 403 }
      )
    }

    const [playlist, clientInfo] = await Promise.all([
      prisma.playlist.findFirst({
        where: { clientId: ctx.clientId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: {
          entries: {
            orderBy: { order: 'asc' },
            include: {
              track: { select: { id: true, title: true, artist: true, fileName: true } },
            },
          },
        },
      }),
      prisma.client.findUnique({
        where: { id: ctx.clientId },
        select: {
          name: true,
          basicData: { select: { projectName: true } },
          radioStream: {
            select: {
              aiPresenterEnabled: true,
              aiPresenterEvery: true,
              aiIntroPhrases: true,
              aiReviewEveryTracks: true,
              aiReviewStyle: true,
              aiReviewAdminEnabled: true,
            },
          },
        },
      }),
    ])

    if (!playlist || playlist.entries.length === 0) {
      return NextResponse.json(
        { error: 'no_playlist', message: 'No hay una playlist activa con temas.' },
        { status: 400 }
      )
    }
    if (playlist.shuffle) {
      return NextResponse.json(
        {
          error: 'shuffle_not_supported',
          message: 'Desactivá “Aleatorio” en la playlist para usar el locutor IA en el AutoDJ.',
        },
        { status: 400 }
      )
    }

    const rs = clientInfo?.radioStream
    const station = clientInfo?.basicData?.projectName || clientInfo?.name || 'la radio'

    // Presentación
    const presenterEnabled = body?.enabled !== undefined
      ? Boolean(body.enabled)
      : Boolean(rs?.aiPresenterEnabled)
    const every = Number(body?.every) || rs?.aiPresenterEvery || 3
    if (!Number.isInteger(every) || every < 2 || every > 10) {
      return NextResponse.json(
        { error: 'invalid_every', message: 'La frecuencia debe ser un entero entre 2 y 10.' },
        { status: 400 }
      )
    }

    // Reseñas
    let reviewEvery =
      body?.reviewEvery !== undefined ? Number(body.reviewEvery) : (rs?.aiReviewEveryTracks ?? 0)
    if (body?.reviewsEnabled !== undefined && !body.reviewsEnabled) reviewEvery = 0
    if (!Number.isInteger(reviewEvery) || !(reviewEvery === 0 || (reviewEvery >= 2 && reviewEvery <= 20))) {
      return NextResponse.json(
        { error: 'invalid_review_every', message: 'La frecuencia de reseñas debe ser 0 o un entero entre 2 y 20 temas.' },
        { status: 400 }
      )
    }
    const rawStyle = body?.reviewStyle !== undefined ? body.reviewStyle : rs?.aiReviewStyle
    if (body?.reviewStyle !== undefined && rawStyle != null && rawStyle !== '' && !isReviewStyle(rawStyle)) {
      return NextResponse.json(
        { error: 'invalid_review_style', message: 'El estilo de reseña elegido no existe.' },
        { status: 400 }
      )
    }
    const reviewStyle = isReviewStyle(rawStyle) ? rawStyle : DEFAULT_REVIEW_STYLE
    const reviewAdminEnabled = rs?.aiReviewAdminEnabled ?? true
    const reviewsActive = reviewAdminEnabled && reviewEvery >= 2

    const entries = playlist.entries
    const phrases = normalizePhrases(parsePhrases(rs?.aiIntroPhrases))

    const introIndices: number[] = []
    if (presenterEnabled) {
      for (let i = 1; i < entries.length; i++) {
        if (i % every === 0) introIndices.push(i)
      }
    }
    const reviewIndices: number[] = []
    if (reviewsActive) {
      for (let i = 1; i < entries.length; i++) {
        if (i % reviewEvery === 0) reviewIndices.push(i)
      }
    }

    if (!presenterEnabled && !reviewsActive) {
      return NextResponse.json(
        { error: 'nothing_to_apply', message: 'Activá la presentación o las reseñas antes de aplicar.' },
        { status: 400 }
      )
    }
    if (presenterEnabled && introIndices.length > MAX_INTROS) {
      return NextResponse.json(
        {
          error: 'too_many_intros',
          message: `La playlist generaría ${introIndices.length} intros (máximo ${MAX_INTROS}). Subí la frecuencia o reducí la playlist.`,
        },
        { status: 400 }
      )
    }
    if (reviewsActive && reviewIndices.length > MAX_REVIEWS) {
      return NextResponse.json(
        {
          error: 'too_many_reviews',
          message: `La playlist generaría ${reviewIndices.length} reseñas (máximo ${MAX_REVIEWS}). Subí la frecuencia o reducí la playlist.`,
        },
        { status: 400 }
      )
    }
    if (presenterEnabled && introIndices.length === 0 && reviewIndices.length === 0) {
      return NextResponse.json(
        { error: 'playlist_too_short', message: 'La playlist no tiene suficientes temas para esa frecuencia.' },
        { status: 400 }
      )
    }

    const needsTts = introIndices.length > 0 || reviewIndices.length > 0
    if (needsTts && !(await hasConfiguredPremiumTts())) {
      return NextResponse.json(
        { error: 'tts_not_configured', message: 'Configurá ElevenLabs o Fish Audio en Locución.' },
        { status: 503 }
      )
    }

    const introTargets = introIndices.map((index) => ({
      index,
      track: entries[index].track,
      text: buildPresenterText(station, entries[index].track, phrases),
    }))
    const introIndexSet = new Set(introIndices)

    const reviewTargets: Array<{
      index: number
      trackId: string
      text: string
    }> = []
    for (const index of reviewIndices) {
      const track = entries[index].track
      const artist = track.artist || ''
      const title = track.title || ''
      const hasIntro = introIndexSet.has(index)

      try {
        if (!isUsableTrackMetadata(artist, title)) {
          // Metadatos poco confiables: si hay artista, una bio corta; si no,
          // una pausa de emisora (siempre empieza con el nombre de la radio).
          if (isUsableArtist(artist)) {
            const existingArtist = await getArtistReviewRecord({
              clientId: ctx.clientId,
              artist,
              style: reviewStyle,
            })
            if (existingArtist && !existingArtist.active) continue
            const artistReview = existingArtist ?? await getOrCreateArtistReview({
              clientId: ctx.clientId,
              artist,
              style: reviewStyle,
              hasIntro,
            })
            if (artistReview) {
              reviewTargets.push({
                index,
                trackId: track.id,
                text: buildReviewSpeech(station, artistReview.text),
              })
              continue
            }
          }
          reviewTargets.push({
            index,
            trackId: track.id,
            text: buildReviewSpeech(station, buildStationBreak(`${track.id}-${index}`)),
          })
          continue
        }

        // Una reseña desactivada por el cliente no se emite ni cae al
        // respaldo de biografía.
        const existing = await getReviewRecord({
          clientId: ctx.clientId,
          artist,
          title,
          style: reviewStyle,
        })
        if (existing && !existing.active) continue

        let review: ReviewRecord | null = existing
        if (!review) {
          review = await getOrCreateReview({
            clientId: ctx.clientId,
            artist,
            title,
            style: reviewStyle,
            hasIntro,
          })
        }
        if (!review && isUsableArtist(artist)) {
          const existingArtist = await getArtistReviewRecord({
            clientId: ctx.clientId,
            artist,
            style: reviewStyle,
          })
          if (existingArtist && !existingArtist.active) continue
          review = existingArtist ?? await getOrCreateArtistReview({
            clientId: ctx.clientId,
            artist,
            style: reviewStyle,
            hasIntro,
          })
        }
        if (!review) continue

        reviewTargets.push({
          index,
          trackId: track.id,
          text: buildReviewSpeech(station, review.text),
        })
      } catch (err) {
        // Un fallo del generador de texto no aborta la preparación del AutoDJ.
        console.warn('[ai/autodj] no se pudo preparar la reseña del tema', track.id, err)
      }
    }

    const totalChars =
      introTargets.reduce((sum, target) => sum + target.text.length, 0) +
      reviewTargets.reduce((sum, target) => sum + target.text.length, 0)
    if (totalChars > access.remaining) {
      return NextResponse.json(
        {
          error: 'ai_quota_exceeded',
          message: `La preparación necesita ${totalChars} caracteres y te quedan ${access.remaining}.`,
          missingCharacters: totalChars - access.remaining,
        },
        { status: 402 }
      )
    }

    // Limpieza de la implementación anterior basada en jingles. Solo tocamos
    // las intros IA; los jingles reales de los clientes quedan intactos.
    try {
      const existing = await streamingClient.listJingles(ctx.clientId)
      const jingles = Array.isArray(existing?.jingles) ? existing.jingles : []
      const aiJingles = jingles.filter((j: { artist?: string | null }) => j.artist === AI_JINGLE_ARTIST)
      const normalJingles = jingles.filter((j: { artist?: string | null }) => j.artist !== AI_JINGLE_ARTIST)
      for (const jingle of aiJingles) {
        if (jingle.id) {
          try {
            await streamingClient.deleteJingle(ctx.clientId, jingle.id)
          } catch (err) {
            console.warn('[ai/autodj] no se pudo borrar jingle IA legado', jingle.id, err)
          }
        }
      }
      if (aiJingles.length > 0 && normalJingles.length === 0) {
        // Restaurar la frecuencia de jingles que había antes de la prueba
        // basada en jingles, solo si el cliente no tiene jingles reales.
        try {
          await streamingClient.updateJingleConfig(ctx.clientId, 5, 1)
        } catch (err) {
          console.warn('[ai/autodj] no se pudo restaurar jinglePlayEvery', err)
        }
      }
    } catch (err) {
      console.warn('[ai/autodj] no se pudieron limpiar jingles IA legados', err)
    }

    await streamingClient.clearAiIntros(ctx.clientId)
    if (reviewEvery === 0) {
      try {
        await streamingClient.clearAiReviews(ctx.clientId)
      } catch (err) {
        // Nodo con agente anterior: las reseñas no se insertarán, pero las
        // intros siguen funcionando.
        console.warn('[ai/autodj] no se pudieron limpiar las reseñas del agente', err)
      }
    } else if (reviewsActive) {
      try {
        // Al reaplicar se regeneran todas las reseñas del estilo/frecuencia
        // actuales; las del estilo anterior no deben quedar.
        await streamingClient.clearAiReviews(ctx.clientId)
      } catch (err) {
        console.warn('[ai/autodj] no se pudieron limpiar las reseñas del agente', err)
      }
    }

    let remaining = access.remaining
    let generatedIntros = 0
    for (let i = 0; i < introTargets.length; i++) {
      const target = introTargets[i]
      let audio
      try {
        audio = await synthesizePremiumTts({
          clientId: ctx.clientId,
          text: target.text,
          direction: FISH_AUDIO_DIRECTIONS.presenter,
          closingDirection: FISH_AUDIO_DIRECTIONS.presenterClosing,
        })
      } catch (err) {
        return NextResponse.json(
          {
            error: 'tts_failed',
            message: err instanceof Error ? err.message : 'No se pudo generar la locución.',
          },
          { status: 503 }
        )
      }
      if (!audio.cached) {
        try {
          await consumeAiCharacters(ctx.clientId, target.text.length, 'autodj-presenter')
        } catch (err) {
          console.error('[ai/autodj] no se pudo registrar la cuota:', err)
        }
        remaining = Math.max(0, remaining - target.text.length)
      }

      const fileName = `ia-${String(i + 1).padStart(4, '0')}-${target.track.id}.mp3`
      const file = new File([new Uint8Array(audio.audio)], fileName, { type: 'audio/mpeg' })
      await streamingClient.uploadAiIntro(ctx.clientId, file)
      generatedIntros++
    }

    let generatedReviews = 0
    for (const target of reviewTargets) {
      try {
        const audio = await synthesizeReviewWithLimit({
          clientId: ctx.clientId,
          text: target.text,
        })
        if (!audio) {
          console.warn('[ai/autodj] la reseña superó el tope de 20 s y se descartó', target.trackId)
          continue
        }
        if (!audio.cached) {
          if (audio.text.length > remaining) {
            console.warn('[ai/autodj] cuota insuficiente para la reseña', target.trackId)
            break
          }
          try {
            await consumeAiCharacters(ctx.clientId, audio.text.length, 'ai-review')
          } catch (err) {
            console.error('[ai/autodj] no se pudo registrar la cuota de la reseña:', err)
          }
          remaining = Math.max(0, remaining - audio.text.length)
        }

        const file = new File(
          [new Uint8Array(audio.audio)],
          reviewFileName(target.index, target.trackId),
          { type: 'audio/mpeg' }
        )
        await streamingClient.uploadAiReview(ctx.clientId, file)
        generatedReviews++
      } catch (err) {
        // Un fallo de TTS o del agente en una reseña no aborta el resto.
        console.warn('[ai/autodj] no se pudo generar la reseña', target.trackId, err)
      }
    }

    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: {
        aiPresenterEnabled: presenterEnabled,
        aiPresenterEvery: every,
        ...(body?.reviewsEnabled !== undefined || body?.reviewEvery !== undefined
          ? { aiReviewEveryTracks: reviewEvery }
          : {}),
        ...(body?.reviewStyle !== undefined ? { aiReviewStyle: reviewStyle } : {}),
      },
    })
    await streamingClient.restart(ctx.clientId)

    return NextResponse.json({
      ok: true,
      generated: generatedIntros,
      generatedIntros,
      generatedReviews,
      every,
      reviewEvery,
      reviewsEnabled: reviewsActive,
      totalCharacters: totalChars,
      remaining,
      playlistTracks: entries.length,
      message: `AutoDJ preparado: ${generatedIntros} intros y ${generatedReviews} reseñas antes de sus temas.`,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
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
