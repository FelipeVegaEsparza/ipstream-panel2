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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = aiCreditPackSchema.parse(await request.json())
    const existing = await prisma.aiCreditPack.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    const pack = await prisma.aiCreditPack.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description || null,
        creditType: data.creditType,
        amount: data.amount,
        price: data.price,
        currency: data.currency,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        order: data.order ?? 0,
      },
    })
    return NextResponse.json(pack)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[admin/ai-credit-packs PUT]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const [requests, grants] = await Promise.all([
      prisma.aiCreditRequest.count({ where: { packId: params.id } }),
      prisma.aiCreditGrant.count({ where: { packId: params.id } }),
    ])
    if (requests > 0 || grants > 0) {
      return NextResponse.json(
        { error: 'El paquete tiene ventas o solicitudes asociadas; desactívalo en vez de eliminarlo' },
        { status: 409 }
      )
    }

    await prisma.aiCreditPack.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/ai-credit-packs DELETE]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
