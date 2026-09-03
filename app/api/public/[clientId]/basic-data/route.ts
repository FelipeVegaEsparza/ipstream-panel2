import { NextRequest, NextResponse } from 'next/server'
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

    const { getPublicBasicData } = await import('@/lib/public-basic-data')
    const basicData = await getPublicBasicData(clientId)

    if (!basicData) {
      return createCorsErrorResponse('Datos básicos no encontrados', 404)
    }

    return createCorsResponse(basicData)

  } catch (error) {
    console.error('Error getting basic data:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
