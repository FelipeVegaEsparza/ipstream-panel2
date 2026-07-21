import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}