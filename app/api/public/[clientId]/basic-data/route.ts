import { NextRequest, NextResponse } from 'next/server'
import { handleCors, createCachedCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { withPublicContentCache } from '@/lib/public-cache'

export async function OPTIONS() {
  return handleCors()
}

async function handleGet(
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

    return createCachedCorsResponse(basicData)

  } catch (error) {
    console.error('Error getting basic data:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export const GET = withPublicContentCache(handleGet)
