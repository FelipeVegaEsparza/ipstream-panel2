import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

// Portada pública de un track de la librería de radio.
// El agente guarda coverUrl como /api/dashboard/streaming/library/{trackId}/cover
// (ruta autenticada); el reproductor del sitio del cliente no puede consumirla.
// Esta ruta pública proxea al agente sin requerir sesión.
export async function GET(
  _request: NextRequest,
  { params }: { params: { clientId: string; trackId: string } }
) {
  try {
    const { clientId, trackId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      return new NextResponse(null, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const agentRes = await streamingClient.getCover(clientId, trackId)
    if (!agentRes.ok) {
      if (agentRes.status === 404) {
        return new NextResponse(null, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } })
      }
      return new NextResponse(
        JSON.stringify({ error: 'agent_error', status: agentRes.status }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    const contentType = agentRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await agentRes.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAgentError) {
      return new NextResponse(
        JSON.stringify({ error: 'agent_error', message: err.message }),
        {
          status: err.status === 404 ? 404 : 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }
    console.error('[public/streaming/library/cover GET]', err)
    return new NextResponse(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
}
