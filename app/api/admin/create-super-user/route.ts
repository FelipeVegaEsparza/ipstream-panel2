import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Verificación + creación atómica para evitar doble creación concurrente
    const result = await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.user.findFirst({
        where: { role: 'ADMIN' }
      })

      if (existingAdmin) {
        return { error: 'Ya existe un super usuario en el sistema', status: 400 as const }
      }

      const existingUser = await tx.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return { error: 'El email ya está en uso', status: 400 as const }
      }

      const superUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN'
        }
      })

      return { superUser }
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    return NextResponse.json({
      message: 'Super usuario creado exitosamente',
      user: {
        id: result.superUser.id,
        name: result.superUser.name,
        email: result.superUser.email,
        role: result.superUser.role
      }
    })
  } catch (error) {
    console.error('Error creating super user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}