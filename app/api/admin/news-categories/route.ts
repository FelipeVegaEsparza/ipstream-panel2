import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { globalNewsCategorySchema } from '@/lib/validations'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const categories = await prisma.globalNewsCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { news: true }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error getting categories:', error)
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
    const data = globalNewsCategorySchema.parse(body)

    const existing = await prisma.globalNewsCategory.findUnique({
      where: { slug: data.slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este slug' },
        { status: 400 }
      )
    }

    const category = await prisma.globalNewsCategory.create({
      data: { ...data } as Prisma.GlobalNewsCategoryUncheckedCreateInput
    })

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
