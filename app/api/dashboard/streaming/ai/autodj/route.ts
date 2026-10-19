// =====================================================
// /api/dashboard/streaming/ai/autodj
// Genera las intros del presentador IA para el AutoDJ y las instala como
// jingles en el orden de la playlist activa. El AutoDJ las reproduce cada N
// temas usando el scheduler de jingles existente.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { synthesizeElevenLabs } from '@/lib/elevenlabs-tts'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

const MAX_INTROS = 80
const AI_ARTIST = 'Locutor IA'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function textFor(station: string, title: string, artist: string | null): string {
  const cleanTitle = title.trim() || 'la siguiente canción'
  const cleanArtist = (artist || '').trim()
  return `Estás escuchando ${station}. A continuación, ${cleanTitle}${cleanArtist ? `, de ${cleanArtist}` : ''}.`
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const every = Number(body?.every)
    if (!Number.isInteger(every) || every < 2 || every > 10) {
      return NextResponse.json(
        { error: 'invalid_every', message: 'La frecuencia debe ser un entero entre 2 y 10.' },
        { status: 400 }
      )
    }

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
        select: { name: true, basicData: { select: { projectName: true } } },
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
    const entries = playlist.entries
    const count = Math.ceil(entries.length / every)
    if (count > MAX_INTROS) {
      return NextResponse.json(
        {
          error: 'too_many_intros',
          message: `La playlist generaría ${count} intros (máximo ${MAX_INTROS}). Subí la frecuencia o reducí la playlist.`,
        },
        { status: 400 }
      )
    }

    const config = await getElevenLabsConfig()
    if (!config.enabled || !config.apiKey || !config.voiceId) {
      return NextResponse.json(
        { error: 'elevenlabs_not_configured', message: 'ElevenLabs no está configurado.' },
        { status: 503 }
      )
    }

    // La lista de jingles es el scheduler del AutoDJ. Si hay jingles normales,
    // el orden de las intros se mezcla y ya no coincide con el próximo tema.
    const existing = await streamingClient.listJingles(ctx.clientId)
    const allJingles = Array.isArray(existing?.jingles) ? existing.jingles : []
    const normalJingles = allJingles.filter((j: { artist?: string | null }) => j.artist !== AI_ARTIST)
    if (normalJingles.length > 0) {
      return NextResponse.json(
        {
          error: 'normal_jingles_present',
          message: 'El AutoDJ IA no se puede combinar con jingles normales. Eliminá o desactivá los jingles antes de prepararlo.',
        },
        { status: 409 }
      )
    }

    const targets: Array<{ track: { id: string; title: string; artist: string | null; fileName: string } }> = []
    for (let k = 1; k <= count; k++) {
      const index = (k * every) % entries.length
      targets.push({ track: entries[index].track })
    }

    const texts = targets.map(({ track }) =>
      textFor(station, track.title || track.fileName.replace(/\.[^.]+$/, ''), track.artist)
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

    // Reemplazar las intros anteriores. Los jingles normales ya se rechazaron.
    for (const jingle of allJingles) {
      if (jingle.artist === AI_ARTIST && jingle.id) {
        try {
          await streamingClient.deleteJingle(ctx.clientId, jingle.id)
        } catch (err) {
          console.warn('[ai/autodj] no se pudo borrar intro anterior', jingle.id, err)
        }
      }
    }

    let remaining = access.remaining
    let generated = 0
    for (let i = 0; i < targets.length; i++) {
      const text = texts[i]
      const track = targets[i].track
      const audio = await synthesizeElevenLabs({
        text,
        apiKey: config.apiKey,
        voiceId: config.voiceId,
        model: config.model,
        cacheEnabled: config.cacheEnabled,
      })
      if (!audio.cached) {
        try {
          await consumeAiCharacters(ctx.clientId, text.length)
        } catch (err) {
          console.error('[ai/autodj] no se pudo registrar la cuota:', err)
        }
        remaining = Math.max(0, remaining - text.length)
      }

      const fileName = `ia-${String(i + 1).padStart(4, '0')}.mp3`
      const file = new File([new Uint8Array(audio.audio)], fileName, { type: 'audio/mpeg' })
      const uploaded = await streamingClient.uploadJingle(ctx.clientId, file)
      const jingleId = uploaded?.jingle?.id
      if (jingleId) {
        const label = track.artist ? `${track.artist} - ${track.title}` : track.title
        try {
          await streamingClient.updateJingle(ctx.clientId, jingleId, {
            title: label.slice(0, 180),
            artist: AI_ARTIST,
          })
        } catch (err) {
          console.warn('[ai/autodj] no se pudo etiquetar la intro', jingleId, err)
        }
      }
      generated++
      // uploadedAt tiene precisión de milisegundos y define el orden del m3u.
      await wait(80)
    }

    // El scheduler de jingles del AutoDJ reproduce una intro cada `every`
    // canciones. El reinicio aplica la nueva config y el nuevo m3u.
    await streamingClient.updateJingleConfig(ctx.clientId, every, 1)

    return NextResponse.json({
      ok: true,
      generated,
      every,
      totalCharacters: totalChars,
      remaining,
      playlistTracks: entries.length,
      message: `AutoDJ preparado: ${generated} intros cada ${every} temas.`,
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
