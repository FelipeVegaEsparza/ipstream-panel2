// =====================================================
// /api/dashboard/streaming/ai/autodj
// Presentador IA del AutoDJ en una fuente separada de los jingles.
// Genera una intro por bloque, la sube a ai-intros y actualiza la frecuencia.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { synthesizePremiumTts, hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { buildPresenterText, normalizePhrases } from '@/lib/live-console/presenter'

export const dynamic = 'force-dynamic'

const MAX_INTROS = 80
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
            select: { aiPresenterEnabled: true, aiPresenterEvery: true, aiIntroPhrases: true },
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
          message: 'Desactivá “Aleatorio” en la playlist para usar el presentador IA en el AutoDJ.',
        },
        { status: 400 }
      )
    }

    const station = clientInfo?.basicData?.projectName || clientInfo?.name || 'la radio'
    const every = Number(body?.every) || clientInfo?.radioStream?.aiPresenterEvery || 3
    if (!Number.isInteger(every) || every < 2 || every > 10) {
      return NextResponse.json(
        { error: 'invalid_every', message: 'La frecuencia debe ser un entero entre 2 y 10.' },
        { status: 400 }
      )
    }
    const phrases = normalizePhrases(parsePhrases(clientInfo?.radioStream?.aiIntroPhrases))
    const entries = playlist.entries
    const count = Math.floor((entries.length - 1) / every)
    if (count <= 0) {
      return NextResponse.json(
        { error: 'playlist_too_short', message: 'La playlist no tiene suficientes temas para esa frecuencia.' },
        { status: 400 }
      )
    }
    if (count > MAX_INTROS) {
      return NextResponse.json(
        {
          error: 'too_many_intros',
          message: `La playlist generaría ${count} intros (máximo ${MAX_INTROS}). Subí la frecuencia o reducí la playlist.`,
        },
        { status: 400 }
      )
    }

    if (!(await hasConfiguredPremiumTts())) {
      return NextResponse.json(
        { error: 'tts_not_configured', message: 'Configurá ElevenLabs o Fish Audio en Locución.' },
        { status: 503 }
      )
    }

    const targets = []
    for (let k = 1; k <= count; k++) {
      targets.push(entries[k * every].track)
    }
    const texts = targets.map((track) =>
      buildPresenterText(station, track, phrases)
    )
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0)
    if (totalChars > access.remaining) {
      return NextResponse.json(
        {
          error: 'ai_quota_exceeded',
          message: `La preparación necesita ${totalChars} caracteres y te quedan ${access.remaining}.`,
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

    let remaining = access.remaining
    let generated = 0
    for (let i = 0; i < targets.length; i++) {
      const text = texts[i]
      const track = targets[i]
      let audio
      try {
        audio = await synthesizePremiumTts({ clientId: ctx.clientId, text })
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
          await consumeAiCharacters(ctx.clientId, text.length, 'autodj-presenter')
        } catch (err) {
          console.error('[ai/autodj] no se pudo registrar la cuota:', err)
        }
        remaining = Math.max(0, remaining - text.length)
      }

      const fileName = `ia-${String(i + 1).padStart(4, '0')}-${track.id}.mp3`
      const file = new File([new Uint8Array(audio.audio)], fileName, { type: 'audio/mpeg' })
      await streamingClient.uploadAiIntro(ctx.clientId, file)
      generated++
    }

    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: {
        aiPresenterEnabled: true,
        aiPresenterEvery: every,
      },
    })
    await streamingClient.restart(ctx.clientId)

    return NextResponse.json({
      ok: true,
      generated,
      every,
      totalCharacters: totalChars,
      remaining,
      playlistTracks: entries.length,
      message: `AutoDJ preparado: ${generated} intros antes de sus temas.`,
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
