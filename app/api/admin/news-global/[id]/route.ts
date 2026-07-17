import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { globalNewsSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const news = await prisma.globalNews.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    if (!news) {
      return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('Error getting global news:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

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
    const data = globalNewsSchema.parse(body)

    const existing = await prisma.globalNews.findFirst({
      where: {
        slug: data.slug,
        NOT: { id: params.id }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe otra noticia global con este slug' },
        { status: 400 }
      )
    }

    const categoryExists = await prisma.globalNewsCategory.findUnique({
      where: { id: data.categoryId }
    })

    if (!categoryExists) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 400 }
      )
    }

    const news = await prisma.globalNews.update({
      where: { id: params.id },
      data
    })

    return NextResponse.json(news)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating global news:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.globalNews.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting global news:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
