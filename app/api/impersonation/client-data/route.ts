import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyImpersonationToken } from '@/lib/impersonation'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener token de impersonación del header o de la cookie
    const impersonationToken =
      request.headers.get('x-impersonation-token') ||
      request.cookies.get('impersonation_token')?.value

    if (!impersonationToken) {
      return NextResponse.json({ error: 'Token de impersonación requerido' }, { status: 400 })
    }

    // Verificar token firmado
    const impersonationData = await verifyImpersonationToken(impersonationToken)

    if (!impersonationData) {
      return NextResponse.json({ error: 'Token de impersonación inválido o expirado' }, { status: 401 })
    }

    // Solo el admin que creó el token puede usarlo
    const isAuthorized =
      session.user.role === 'ADMIN' ||
      session.user.id === impersonationData.adminId ||
      session.originalUser?.id === impersonationData.adminId

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar que el admin existe
    const admin = await prisma.user.findUnique({
      where: { id: impersonationData.adminId }
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin no válido' }, { status: 401 })
    }

    // Obtener datos completos del cliente
    const client = await prisma.client.findUnique({
      where: { id: impersonationData.clientId },
      include: {
        user: true,
        plan: true,
        basicData: true,
        socialNetworks: true,
        programs: {
          orderBy: { createdAt: 'desc' }
        },
        news: {
          orderBy: { createdAt: 'desc' }
        },
        rankingVideos: {
          orderBy: { order: 'asc' }
        },
        sponsors: {
          orderBy: { createdAt: 'desc' }
        },
        promotions: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            programs: true,
            news: true,
            rankingVideos: true,
            sponsors: true,
            promotions: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      client,
      impersonationInfo: {
        adminId: impersonationData.adminId,
        adminEmail: impersonationData.adminEmail,
        startTime: impersonationData.timestamp
      }
    })

  } catch (error) {
    console.error('Error al obtener datos del cliente impersonado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}