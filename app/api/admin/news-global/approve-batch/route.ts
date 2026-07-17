import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { aiApproveBatchSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = aiApproveBatchSchema.parse(body)

    const result = await prisma.globalNews.updateMany({
      where: {
        id: { in: data.ids },
        status: 'draft',
      },
      data: { status: 'published' },
    })

    return NextResponse.json({ approved: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error approving batch:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
