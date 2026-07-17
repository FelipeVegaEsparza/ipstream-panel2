import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tutorialSchema } from '@/lib/validations'
import { extractYouTubeId } from '@/lib/youtube'

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
    const data = tutorialSchema.parse(body)

    if (!extractYouTubeId(data.youtubeUrl)) {
      return NextResponse.json(
        { error: 'La URL de YouTube no es válida' },
        { status: 400 }
      )
    }

    const existing = await prisma.tutorial.findUnique({
      where: { id: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tutorial no encontrado' }, { status: 404 })
    }

    const tutorial = await prisma.tutorial.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description || null,
        youtubeUrl: data.youtubeUrl,
        categoryId: data.categoryId,
        order: data.order,
        isPublished: data.isPublished,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ message: 'Tutorial actualizado', tutorial })
  } catch (error) {
    console.error('Error al actualizar tutorial:', error)
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

    await prisma.tutorial.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Tutorial eliminado' })
  } catch (error) {
    console.error('Error al eliminar tutorial:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
