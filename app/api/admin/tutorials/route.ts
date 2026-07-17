import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tutorialSchema } from '@/lib/validations'
import { extractYouTubeId } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where = categoryId ? { categoryId } : {}

    const tutorials = await prisma.tutorial.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ tutorials })
  } catch (error) {
    console.error('Error al listar tutoriales:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const category = await prisma.tutorialCategory.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      return NextResponse.json(
        { error: 'La categoría no existe' },
        { status: 400 }
      )
    }

    const tutorial = await prisma.tutorial.create({
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

    return NextResponse.json({ message: 'Tutorial creado', tutorial }, { status: 201 })
  } catch (error) {
    console.error('Error al crear tutorial:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
