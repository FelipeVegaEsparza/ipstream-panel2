import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { newsSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'news')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user.clientId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = newsSchema.parse(body)

    // Verificar que el slug no exista para este cliente
    const existingNews = await prisma.news.findFirst({
      where: {
        clientId: session.user.clientId,
        slug: data.slug
      }
    })

    if (existingNews) {
      return NextResponse.json(
        { error: 'Ya existe una noticia con este slug' },
        { status: 400 }
      )
    }

    const news = await prisma.news.create({
      data: {
        ...data,
        clientId: session.user.clientId,
      } as Prisma.NewsUncheckedCreateInput
    })

    return NextResponse.json(news)
  } catch (error) {
    console.error('Error creating news:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
