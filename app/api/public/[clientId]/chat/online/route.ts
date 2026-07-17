import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

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

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const recent = await prisma.chatMessage.findMany({
      where: { clientId, createdAt: { gte: tenMinutesAgo } },
      select: { name: true, authorType: true, email: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const uniqueNames = new Set<string>()
    let activeCount = 0

    for (const m of recent) {
      const key = m.authorType === 'staff' ? `staff:${m.name}` : (m.email || m.name)
      if (!uniqueNames.has(key)) {
        uniqueNames.add(key)
        activeCount++
      }
    }

    const recentNames = Array.from(
      new Set(recent.filter((m) => m.authorType === 'listener').map((m) => m.name))
    ).slice(0, 10)

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
