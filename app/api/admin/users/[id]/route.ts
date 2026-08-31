import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

const updateUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().optional().refine(
    (val) => !val || val.length >= 6,
    'La contraseña debe tener al menos 6 caracteres'
  ),
  clientName: z.string().min(1, 'El nombre del proyecto es requerido'),
  phone: z.string().optional().transform(val => val?.trim() || undefined),
  websiteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  oneSignalAppId: z.string().optional().transform(val => val?.trim() || undefined),
  oneSignalApiKey: z.string().optional().transform(val => val?.trim() || undefined),
  plan: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        client: {
          include: {
            _count: {
              select: {
                programs: true,
                news: true,
                rankingVideos: true,
                sponsors: true,
                promotions: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const userWithDecryptedKey = {
      ...user,
      client: user.client
        ? {
            ...user.client,
            oneSignalApiKey: user.client.oneSignalApiKey
              ? isEncrypted(user.client.oneSignalApiKey)
                ? decrypt(user.client.oneSignalApiKey)
                : user.client.oneSignalApiKey
              : null
          }
        : null
    }

    return NextResponse.json(userWithDecryptedKey)
  } catch (error) {
    console.error('Error fetching user:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { client: true }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el email no esté en uso por otro usuario
    if (data.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (emailInUse) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      name: data.name,
      email: data.email,
    }

    // Solo actualizar contraseña si se proporciona
    if (data.password && data.password.length > 0) {
      updateData.password = await bcrypt.hash(data.password, 12)
    }

    // Actualizar usuario y cliente en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar usuario
      const user = await tx.user.update({
        where: { id: params.id },
        data: updateData
      })

      let client = null
      if (existingUser.client) {
        const oneSignalApiKey = data.oneSignalApiKey
          ? encrypt(data.oneSignalApiKey)
          : existingUser.client.oneSignalApiKey

        client = await tx.client.update({
          where: { id: existingUser.client.id },
          data: {
            name: data.clientName,
            phone: data.phone || null,
            oneSignalAppId: data.oneSignalAppId ?? existingUser.client.oneSignalAppId,
            oneSignalApiKey
          }
        })

        // Guardar la URL del sitio web del cliente en sus datos básicos (upsert aislado)
        if (data.websiteUrl !== undefined) {
          await tx.basicData.upsert({
            where: { clientId: existingUser.client.id },
            update: { websiteUrl: data.websiteUrl || null },
            create: {
              clientId: existingUser.client.id,
              projectName: data.clientName,
              projectDescription: '',
              websiteUrl: data.websiteUrl || null,
            },
          })
        }
      }

      return { user, client }
    })

    return NextResponse.json({
      message: 'Usuario actualizado exitosamente',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        client: result.client
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { client: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // No permitir eliminar administradores
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'No se puede eliminar un administrador' },
        { status: 400 }
      )
    }

    // Eliminar usuario (el cliente se elimina automáticamente por CASCADE)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      message: 'Usuario eliminado exitosamente' 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}