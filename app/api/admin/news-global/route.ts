import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { globalNewsSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const skip = (page - 1) * limit
    const categoryId = searchParams.get('categoryId')
    const status = searchParams.get('status')
    const aiRunId = searchParams.get('aiRunId')

    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId
    if (status === 'draft' || status === 'published') where.status = status
    if (aiRunId) where.aiRunId = aiRunId

    const [news, total] = await Promise.all([
      prisma.globalNews.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.globalNews.count({ where })
    ])

    return NextResponse.json({
      data: news,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error getting global news:', error)
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
    const data = globalNewsSchema.parse(body)

    const existing = await prisma.globalNews.findUnique({
      where: { slug: data.slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una noticia global con este slug' },
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

    const news = await prisma.globalNews.create({ data })

    return NextResponse.json(news)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating global news:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
