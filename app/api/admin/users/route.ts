import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { encrypt } from '@/lib/encryption'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'

// GET - Obtener todos los usuarios (sin API keys en la lista)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      include: {
        client: {
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const sanitizedUsers = users.map(user => {
      if (user.client) {
        const { oneSignalApiKey, ...clientWithoutKey } = user.client
        return { ...user, client: { ...clientWithoutKey, oneSignalApiKey: undefined } }
      }
      return user
    })

    return NextResponse.json(sanitizedUsers)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  clientName: z.string().min(1, 'El nombre del proyecto es requerido'),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
  radioServerId: z.string().optional().transform(val => val?.trim() || undefined),
  videoServerId: z.string().optional().transform(val => val?.trim() || undefined),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Verificar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Crear usuario y cliente en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: 'CLIENT'
        }
      })

      const oneSignalApiKey = data.oneSignalApiKey
        ? encrypt(data.oneSignalApiKey)
        : null

      const client = await tx.client.create({
        data: {
          userId: user.id,
          name: data.clientName,
          oneSignalAppId: data.oneSignalAppId || null,
          oneSignalApiKey,
        }
      })

      return { user, client }
    })

    // Auto-crear RadioStream + VideoStream
    let streamInfo = null
    let streamError: string | null = null
    try {
      const created = await createRadioStreamForClient(result.client.id, 128, data.radioServerId)
      streamInfo = {
        icecastMount: created.icecastMount,
        telnetPort: created.telnetPort,
      }
    } catch (err: any) {
      console.error('Error creando RadioStream para nuevo cliente:', err)
      streamError = err.message
    }
    try {
      await createVideoStreamForClient(result.client.id, data.videoServerId)
    } catch (err) {
      console.error('Error creando VideoStream:', err)
    }

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        client: {
          id: result.client.id,
          name: result.client.name,
          planId: result.client.planId
        }
      },
      // Info del stream (null si falló la creación)
      stream: streamInfo,
      streamError,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}