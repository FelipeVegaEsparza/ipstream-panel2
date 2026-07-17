import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const client = await prisma.client.findUnique({
      where: { id: session.user.clientId },
      include: {
        genericCategories: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const config = await prisma.appConfig.findFirst()

    return NextResponse.json({
      useGenericNews: client.useGenericNews,
      selectedCategories: client.genericCategories,
      enableGenericNews: config?.enableGenericNews ?? false
    })
  } catch (error) {
    console.error('Error getting generic news settings:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { useGenericNews, categoryIds } = body

    if (useGenericNews !== undefined) {
      await prisma.client.update({
        where: { id: session.user.clientId },
        data: { useGenericNews }
      })
    }

    if (categoryIds !== undefined) {
      const categories = await prisma.globalNewsCategory.findMany({
        where: { id: { in: categoryIds } }
      })

      await prisma.client.update({
        where: { id: session.user.clientId },
        data: {
          genericCategories: {
            set: categories.map(c => ({ id: c.id }))
          }
        }
      })
    }

    const client = await prisma.client.findUnique({
      where: { id: session.user.clientId },
      include: {
        genericCategories: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    return NextResponse.json({
      useGenericNews: client?.useGenericNews,
      selectedCategories: client?.genericCategories
    })
  } catch (error) {
    console.error('Error updating generic news settings:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
