import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tutorialCategorySchema } from '@/lib/validations'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const categories = await prisma.tutorialCategory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { tutorials: true } } },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error al listar categorías:', error)
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
    const data = tutorialCategorySchema.parse(body)

    const existing = await prisma.tutorialCategory.findUnique({
      where: { name: data.name },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 400 }
      )
    }

    const category = await prisma.tutorialCategory.create({
      data: {
        name: data.name,
        description: data.description || null,
        order: data.order,
      },
    })

    return NextResponse.json({ message: 'Categoría creada', category }, { status: 201 })
  } catch (error) {
    console.error('Error al crear categoría:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
