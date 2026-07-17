import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tutorialCategorySchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = tutorialCategorySchema.parse(body)

    const existing = await prisma.tutorialCategory.findFirst({
      where: { name: data.name, NOT: { id: params.id } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe otra categoría con ese nombre' },
        { status: 400 }
      )
    }

    const category = await prisma.tutorialCategory.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description || null,
        order: data.order,
      },
    })

    return NextResponse.json({ message: 'Categoría actualizada', category })
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.tutorialCategory.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Categoría eliminada' })
  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
