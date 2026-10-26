import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { aiCreditPackSchema } from '@/lib/validations'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const packs = await prisma.aiCreditPack.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(packs)
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = aiCreditPackSchema.parse(await request.json())
    const pack = await prisma.aiCreditPack.create({
      data: {
        name: data.name,
        description: data.description || null,
        creditType: data.creditType,
        amount: data.amount,
        price: data.price,
        currency: data.currency,
        isActive: data.isActive ?? true,
        order: data.order ?? 0,
      },
    })
    return NextResponse.json(pack)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[admin/ai-credit-packs POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
