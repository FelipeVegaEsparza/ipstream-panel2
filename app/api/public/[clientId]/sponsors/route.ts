import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    // Verificar que el cliente exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener sponsors
    const sponsors = await prisma.sponsor.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        address: true,
        description: true,
        facebook: true,
        youtube: true,
        instagram: true,
        tiktok: true,
        whatsapp: true,
        x: true,
        website: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })

    return createCorsResponse(sponsors)

  } catch (error) {
    console.error('Error getting sponsors:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}