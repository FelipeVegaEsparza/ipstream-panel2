import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { isChatEnabledForClient } from '@/lib/chat-helpers'

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
    if (!(await isChatEnabledForClient(clientId))) {
      return createCorsErrorResponse('Chat deshabilitado', 403)
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const recent = await prisma.chatMessage.findMany({
      where: { clientId, createdAt: { gte: tenMinutesAgo }, authorType: 'listener' },
      select: { name: true, email: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const uniqueNames = new Set<string>()
    for (const message of recent) {
      uniqueNames.add(message.email || message.name)
    }

    const activeCount = uniqueNames.size
    const recentNames = Array.from(new Set(recent.map((message) => message.name))).slice(0, 10)

    return createCorsResponse({
      count: activeCount,
      recentNames,
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting chat online count:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
