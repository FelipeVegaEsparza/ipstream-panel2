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
        id: true,
        icecastMount: true,
        bitrate: true,
        status: true,
        listenerCount: true,
        currentTitle: true,
        currentArtist: true,
        lastStatusAt: true,
        client: { select: { name: true } },
      },
    })
    if (!radioStream) {
      return createCorsErrorResponse('Streaming no encontrado', 404)
    }

    let live: any = null
    try {
      live = await streamingClient.getStatus(params.clientId)
    } catch (err) {
      if (!(err instanceof StreamingAgentError)) throw err
    }

    const icecast = live?.icecast
    const icePublicBase = await getRadioPublicBaseUrl(params.clientId)
    return createCorsResponse({
      clientId: params.clientId,
      clientName: radioStream.client.name,
      mount: radioStream.icecastMount,
      bitrate: radioStream.bitrate,
      status: radioStream.status,
      isLive: icecast ? true : false,
      listeners: icecast?.listeners ?? 0,
      listenerPeak: icecast?.listener_peak ?? 0,
      currentTitle: icecast?.title ?? radioStream.currentTitle,
      currentArtist: null,
      currentCoverUrl: null,
      streamUrls: {
        http: `${icePublicBase}/${radioStream.icecastMount}`,
      },
      lastUpdate: icecast ? live?.timestamp : radioStream.lastStatusAt,
    })
  } catch (err) {
    console.error('[public/streaming/status]', err)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
