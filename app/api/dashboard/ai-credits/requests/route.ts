import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  packId: z.string().trim().min(1),
  note: z.string().trim().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const effective = await getEffectiveClientFromRequest(request)
  if (!effective) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = requestSchema.parse(await request.json())
    const pack = await prisma.aiCreditPack.findFirst({
      where: { id: data.packId, isActive: true },
    })
    if (!pack) {
      return NextResponse.json({ error: 'Paquete no disponible' }, { status: 404 })
    }

    const pending = await prisma.aiCreditRequest.findFirst({
      where: {
        clientId: effective.clientId,
        packId: pack.id,
        status: 'pending',
      },
      select: { id: true },
    })
    if (pending) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente para este paquete' },
        { status: 409 }
      )
    }

    const created = await prisma.aiCreditRequest.create({
      data: {
        clientId: effective.clientId,
        packId: pack.id,
        status: 'pending',
        creditType: pack.creditType,
        amount: pack.amount,
        price: pack.price,
        currency: pack.currency,
        note: data.note || null,
      },
      select: {
        id: true,
        packId: true,
        status: true,
        creditType: true,
        amount: true,
        price: true,
        currency: true,
        note: true,
        createdAt: true,
      },
    })

    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[dashboard/ai-credits/requests POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
