import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { basicDataSchema } from '@/lib/validations'
import { sanitizeObject, validateText } from '@/lib/text-sanitizer'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'

export async function POST(request: NextRequest) {
  return handleBasicData(request)
}

export async function PUT(request: NextRequest) {
  return handleBasicData(request)
}

async function handleBasicData(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'basic-data')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    console.log('🏠 Updating basic data - Start')
    
    // Usar la función helper para obtener el cliente efectivo
    const effectiveClient = await getEffectiveClientFromRequest(request)
    
    if (!effectiveClient) {
      console.log('🏠 No effective client found')
      return NextResponse.json(
        { error: 'No autorizado - Sin cliente asociado' },
        { status: 401 }
      )
    }

    console.log('🏠 Effective client:', effectiveClient)

    const body = await request.json()
    console.log('🏠 Request body keys:', Object.keys(body))
    
    // Sanitizar el texto antes de validar
    const sanitizedBody = sanitizeObject(body)
    console.log('🏠 Text sanitized')
    
    // Validar campos de texto críticos
    if (sanitizedBody.projectName) {
      const nameValidation = validateText(sanitizedBody.projectName)
      if (!nameValidation.isValid) {
        console.log('🏠 Invalid project name:', nameValidation.error)
        return NextResponse.json(
          { error: `Nombre del proyecto inválido: ${nameValidation.error}` },
          { status: 400 }
        )
      }
    }
    
    if (sanitizedBody.projectDescription) {
      const descValidation = validateText(sanitizedBody.projectDescription)
      if (!descValidation.isValid) {
        console.log('🏠 Invalid project description:', descValidation.error)
        return NextResponse.json(
          { error: `Descripción inválida: ${descValidation.error}` },
          { status: 400 }
        )
      }
    }

    const data = basicDataSchema.parse(sanitizedBody)
    console.log('🏠 Validated data keys:', Object.keys(data))

    console.log('🏠 Updating basic data in database...')
    const basicData = await prisma.basicData.upsert({
      where: {
        clientId: effectiveClient.clientId,
      },
      update: data,
      create: {
        ...data,
        clientId: effectiveClient.clientId,
      } as Prisma.BasicDataUncheckedCreateInput
    })

    console.log('🏠 Basic data updated successfully:', basicData.id)
    return NextResponse.json(basicData)
  } catch (error) {
    console.error('🏠 Error updating basic data:', error)
    
    if (error instanceof Error) {
      console.error('🏠 Error message:', error.message)
      console.error('🏠 Error stack:', error.stack)
      
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