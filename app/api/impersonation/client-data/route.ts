import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Obtener token de impersonación del header
    const impersonationToken = request.headers.get('x-impersonation-token')
    
    if (!impersonationToken) {
      return NextResponse.json({ error: 'Token de impersonación requerido' }, { status: 400 })
    }

    // Decodificar y verificar token de impersonación
    let impersonationData
    try {
      impersonationData = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())
    } catch (error) {
      console.error('Error decoding token:', error)
      return NextResponse.json({ error: 'Token de impersonación inválido' }, { status: 401 })
    }
    
    // Verificar que el token no haya expirado
    if (Date.now() > impersonationData.expires) {
      return NextResponse.json({ error: 'Token de impersonación expirado' }, { status: 401 })
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