import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { getRadioPublicBaseUrl } from '@/lib/streaming-helpers'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const radioStream = await prisma.radioStream.findUnique({
      where: { clientId: params.clientId },
      select: {
        id: true, icecastMount: true, bitrate: true, status: true,
        listenerCount: true, currentTitle: true, currentArtist: true,
        jinglePlayEvery: true, jinglePlayCount: true,
        lastStatusAt: true,
        client: { select: { name: true } },
      },
    })
    if (!radioStream) {
      return createCorsErrorResponse('Streaming no encontrado', 404)
    }

    let status: any = null
    let nowPlaying: any = null
    try {
      ;[status, nowPlaying] = await Promise.all([
        streamingClient.getStatus(params.clientId),
        streamingClient.getNowPlaying(params.clientId),
      ])
    } catch (err) {
      if (!(err instanceof StreamingAgentError)) throw err
    }

    const icecast = status?.icecast
    const currentTrack = nowPlaying?.currentTrack
    const nextTrack = nowPlaying?.nextTrack

    // Preferir icecast.title (real) sobre currentTrack (match por substring).
    // currentTrack puede matchear siempre el primer track si el substring
    // matchea contra titles largos. icecast.title es lo que liquidsoap
    // realmente reporta a Icecast.
    const rawTitle = icecast?.title || null
    const track = currentTrack
      ? {
          // Si hay currentTrack (local), usar su info enriquecida (coverUrl,
          // album) pero preferir el titulo de Icecast si esta disponible.
          title: rawTitle || currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          coverUrl: currentTrack.coverUrl,
          duration: currentTrack.duration,
          isJingle: currentTrack.isJingle,
        }
      : {
          title: rawTitle ?? radioStream.currentTitle,
          artist: radioStream.currentArtist,
          album: null,
          coverUrl: null,
          duration: null,
          isJingle: false,
        }

    const icePublicBase = await getRadioPublicBaseUrl(params.clientId)
    const res = createCorsResponse({
      clientId: params.clientId,
      clientName: radioStream.client.name,
      mount: radioStream.icecastMount,
      streamUrl: `${icePublicBase}/${radioStream.icecastMount}`,
      bitrate: radioStream.bitrate,
      status: radioStream.status,
      isLive: icecast ? true : false,
      listeners: icecast?.listeners ?? 0,
      listenerPeak: icecast?.listener_peak ?? 0,
      jingleConfig: {
        playEvery: radioStream.jinglePlayEvery,
        playCount: radioStream.jinglePlayCount,
      },
      currentTrack: track,
      nextTrack: nextTrack
        ? {
            title: nextTrack.title,
            artist: nextTrack.artist,
            album: nextTrack.album,
            coverUrl: nextTrack.coverUrl,
            duration: nextTrack.duration,
            isJingle: nextTrack.isJingle,
          }
        : null,
      position: nowPlaying?.position ?? null,
      lastUpdate: icecast ? status?.timestamp : radioStream.lastStatusAt,
    })
    // Evitar cache del browser/CDN para que el dashboard vea cambios en vivo.
    res.headers.set('Cache-Control', 'no-store, must-revalidate')
    return res
  } catch (err) {
    console.error('[public/streaming]', err)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
