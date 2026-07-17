import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { socialNetworksSchema } from '@/lib/validations'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'social-networks')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
}

export async function PUT(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'social-networks')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    console.log('🌐 Updating social networks - Start')
    
    // Usar la función helper para obtener el cliente efectivo
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      console.log('🌐 No effective client found')
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    console.log('🌐 Effective client:', effectiveClient)

    const body = await request.json()
    console.log('🌐 Request body keys:', Object.keys(body))
    
    // Sanitizar el texto antes de validar (URLs pueden contener caracteres especiales)
    const sanitizedBody = sanitizeObject(body)
    console.log('🌐 Text sanitized')

    const data = socialNetworksSchema.parse(sanitizedBody)
    console.log('🌐 Validated data keys:', Object.keys(data))

    console.log('🌐 Updating social networks in database...')
    const socialNetworks = await prisma.socialNetworks.upsert({
      where: {
        clientId: effectiveClient.clientId,
      },
      update: data,
      create: {
        ...data,
        clientId: effectiveClient.clientId,
      }
    })

    console.log('🌐 Social networks updated successfully:', socialNetworks.id)
    return NextResponse.json(socialNetworks)
  } catch (error) {
    console.error('🌐 Error updating social networks:', error)
    
    if (error instanceof Error) {
      console.error('🌐 Error message:', error.message)
      console.error('🌐 Error stack:', error.stack)
      
      // Check for specific Prisma errors
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Cliente no válido' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}