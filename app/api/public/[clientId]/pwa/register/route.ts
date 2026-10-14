import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const { clientId } = params
    const body = await request.json()
    const { deviceId, installed } = body

    if (!deviceId || typeof deviceId !== 'string') {
      return createCorsErrorResponse('deviceId es requerido', 400)
    }

    const markInstalled = installed === true

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const existing = await prisma.pwaInstall.findUnique({
      where: { clientId_deviceId: { clientId, deviceId } },
    })

    let registered = false
    if (!existing) {
      await prisma.pwaInstall.create({
        data: {
          clientId,
          deviceId,
          installedAt: markInstalled ? new Date() : null,
        },
      })
      registered = true
    } else if (markInstalled && !existing.installedAt) {
      // Marca idempotente: una vez instalado, no vuelve a cambiar.
      await prisma.pwaInstall.update({
        where: { id: existing.id },
        data: { installedAt: new Date() },
      })
    }

    const [total, installedCount] = await Promise.all([
      prisma.pwaInstall.count({ where: { clientId } }),
      prisma.pwaInstall.count({
        where: { clientId, installedAt: { not: null } },
      }),
    ])

    return createCorsResponse({
      registered,
      total,
      installedCount,
      firstTime: !existing,
    })
  } catch (error) {
    console.error('Error registering PWA install:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
