import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const [categories, tutorials] = await Promise.all([
      prisma.tutorialCategory.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.tutorial.findMany({
        where: { isPublished: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          youtubeUrl: true,
          categoryId: true,
          order: true,
        },
      }),
    ])

    return NextResponse.json({ categories, tutorials })
  } catch (error) {
    console.error('Error al obtener tutoriales:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
