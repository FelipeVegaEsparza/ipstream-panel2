import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit({
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 5 registros por hora por IP
      identifier: `register:${ip}`,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Inténtalo más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario y cliente
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        client: {
          create: {
            name: name,
          }
        }
      },
      include: {
        client: true
      }
    })

    // Auto-crear RadioStream + VideoStream para el nuevo cliente
    let streamInfo = null
    if (user.client) {
      try {
        streamInfo = await createRadioStreamForClient(user.client.id)
      } catch (err) {
        console.error('Error creando RadioStream para nuevo cliente:', err)
      }
      try {
        await createVideoStreamForClient(user.client.id)
      } catch (err) {
        console.error('Error creando VideoStream para nuevo cliente:', err)
      }
    }

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      // Devolvemos info del stream para que la UI pueda mostrarlo
      stream: streamInfo ? {
        icecastMount: streamInfo.icecastMount,
        telnetPort: streamInfo.telnetPort,
        // NO devolvemos passwords — eso va por /api/dashboard/streaming/connection
      } : null,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}