// =====================================================
// /api/public/[clientId]/streaming/status — Status público del stream
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

// Sin auth — endpoint público (CORS abierto)
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    // Verificar que el cliente existe y tiene streaming habilitado
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
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Obtener status en vivo del agent (combina DB + Icecast)
    let live: any = null
    try {
      live = await streamingClient.getStatus(params.clientId)
    } catch (err) {
      if (!(err instanceof StreamingAgentError)) throw err
    }

    const icecast = live?.icecast
    return NextResponse.json({
      clientId: params.clientId,
      clientName: radioStream.client.name,
      mount: radioStream.icecastMount,
      bitrate: radioStream.bitrate,
      // Snapshot DB
      status: radioStream.status,
      // Datos en vivo (de Icecast si están disponibles)
      isLive: icecast ? true : false,
      listeners: icecast?.listeners ?? 0,
      listenerPeak: icecast?.listener_peak ?? 0,
      currentTitle: icecast?.title ?? radioStream.currentTitle,
      currentArtist: null,
      // URLs públicas para el reproductor
      streamUrls: {
        http: `${process.env.ICE_PUBLIC_URL || 'http://localhost:8000'}/${radioStream.icecastMount}`,
      },
      lastUpdate: icecast ? live?.timestamp : radioStream.lastStatusAt,
    })
  } catch (err) {
    console.error('[public/streaming/status]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
