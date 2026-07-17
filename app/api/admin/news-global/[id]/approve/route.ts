import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
      select: { id: true, status: true },
    })

    if (!news) {
      return NextResponse.json({ error: 'Noticia no encontrada' }, { status: 404 })
    }

    if (news.status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar noticias en estado borrador' },
        { status: 400 }
      )
    }

    const updated = await prisma.globalNews.update({
      where: { id: params.id },
      data: { status: 'published' },
    })

    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch (error) {
    console.error('Error approving global news:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
