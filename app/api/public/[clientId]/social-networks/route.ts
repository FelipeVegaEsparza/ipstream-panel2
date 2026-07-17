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

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener redes sociales
    const socialNetworks = await prisma.socialNetworks.findUnique({
      where: { clientId },
      select: {
        facebook: true,
        youtube: true,
        instagram: true,
        tiktok: true,
        whatsapp: true,
        x: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!socialNetworks) {
      return createCorsErrorResponse('Redes sociales no encontradas', 404)
    }

    return createCorsResponse(socialNetworks)

  } catch (error) {
    console.error('Error getting social networks:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}