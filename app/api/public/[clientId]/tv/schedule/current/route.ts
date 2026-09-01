import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { videoClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const result = await videoClient.getCurrentSchedule(clientId)

    const res = createCorsResponse({
      current: result.current ?? null,
      upcoming: Array.isArray(result.upcoming) ? result.upcoming : [],
      timezone: result.timezone ?? 'UTC',
    })
    res.headers.set('Cache-Control', 'no-store, must-revalidate')
    return res
  } catch (err) {
    if (err instanceof StreamingAgentError) {
      return createCorsErrorResponse(
        err.message || 'Error del agente de streaming',
        502
      )
    }
    if (err instanceof Error && err.message.includes('No hay servidor de streaming')) {
      return createCorsErrorResponse(err.message, 502)
    }
    console.error('[public/tv/schedule/current]', err)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
