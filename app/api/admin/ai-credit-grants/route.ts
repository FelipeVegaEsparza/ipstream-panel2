import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createAiCreditGrant, packCreditSnapshot } from '@/lib/ai-credits'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const directGrantSchema = z.object({
  clientId: z.string().trim().min(1),
  packId: z.string().trim().min(1),
  paymentMethod: z.string().trim().min(1).optional(),
  paidAt: z.string().optional(),
  note: z.string().trim().max(2000).optional(),
})

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = directGrantSchema.parse(await request.json())
    const result = await prisma.$transaction(async (tx) => {
      const [client, pack] = await Promise.all([
        tx.client.findUnique({ where: { id: data.clientId }, select: { id: true } }),
        tx.aiCreditPack.findUnique({ where: { id: data.packId } }),
      ])
      if (!client) throw new Error('client_not_found')
      if (!pack) throw new Error('pack_not_found')
      if (!pack.isActive) throw new Error('pack_inactive')

      const paidAt = data.paidAt ? new Date(data.paidAt) : new Date()
      const payment = await tx.payment.create({
        data: {
          clientId: data.clientId,
          subscriptionId: null,
          amount: pack.price,
          currency: pack.currency,
          status: 'completed',
          paymentMethod: data.paymentMethod || 'manual',
          description: `Paquete IA: ${pack.name}`,
          dueDate: paidAt,
          paidAt,
        },
        select: { id: true },
      })

      const snapshot = packCreditSnapshot(pack)
      const grant = await createAiCreditGrant(tx, {
        clientId: data.clientId,
        packId: pack.id,
        source: 'admin',
        characters: snapshot.characters,
        musicSeconds: snapshot.musicSeconds,
        paymentId: payment.id,
        note: data.note || null,
      })
      return { grant, paymentId: payment.id }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : ''
    if (message === 'client_not_found' || message === 'pack_not_found') {
      return NextResponse.json({ error: 'Cliente o paquete no encontrado' }, { status: 404 })
    }
    if (message === 'pack_inactive') {
      return NextResponse.json({ error: 'El paquete está desactivado' }, { status: 400 })
    }
    console.error('[admin/ai-credit-grants POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
