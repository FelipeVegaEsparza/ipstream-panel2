import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const skip = (page - 1) * limit

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        useGenericNews: true,
        genericCategories: {
          select: { id: true }
        }
      }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const config = await prisma.appConfig.findFirst()

    if (config?.enableGenericNews && client.useGenericNews) {
      const categoryIds = client.genericCategories.map(c => c.id)

      const [news, total] = await Promise.all([
        prisma.globalNews.findMany({
          where: { categoryId: { in: categoryIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            shortText: true,
            longText: true,
            imageUrl: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: { id: true, name: true, slug: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.globalNews.count({
          where: { categoryId: { in: categoryIds } }
        })
      ])

      const totalPages = Math.ceil(total / limit)

      return createCorsResponse({
        data: news,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages
        },
        source: 'generic'
      })
    }

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          slug: true,
          shortText: true,
          longText: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.news.count({
        where: { clientId }
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return createCorsResponse({
      data: news,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      },
      source: 'own'
    })

  } catch (error) {
    console.error('Error getting news:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
