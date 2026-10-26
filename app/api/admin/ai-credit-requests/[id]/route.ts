import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { packCreditSnapshot, createAiCreditGrant } from '@/lib/ai-credits'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  paymentMethod: z.string().trim().min(1).optional(),
  paidAt: z.string().optional(),
  note: z.string().trim().max(2000).optional(),
})

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = actionSchema.parse(await request.json())
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.aiCreditRequest.findUnique({
        where: { id: params.id },
        include: { pack: { select: { name: true } } },
      })
      if (!current) throw new Error('request_not_found')
      if (current.status !== 'pending') throw new Error('request_not_pending')

      if (data.action === 'reject') {
        return tx.aiCreditRequest.update({
          where: { id: current.id },
          data: {
            status: 'rejected',
            note: data.note || current.note,
            resolvedBy: session.user.id,
            resolvedAt: new Date(),
          },
        })
      }

      const paidAt = data.paidAt ? new Date(data.paidAt) : new Date()
      const payment = await tx.payment.create({
        data: {
          clientId: current.clientId,
          subscriptionId: null,
          amount: current.price,
          currency: current.currency,
          status: 'completed',
          paymentMethod: data.paymentMethod || 'manual',
          description: `Paquete IA: ${current.pack.name}`,
          dueDate: paidAt,
          paidAt,
        },
        select: { id: true },
      })

      const snapshot = packCreditSnapshot({
        creditType: current.creditType,
        amount: current.amount,
      })
      await createAiCreditGrant(tx, {
        clientId: current.clientId,
        packId: current.packId,
        requestId: current.id,
        source: 'request',
        characters: snapshot.characters,
        musicSeconds: snapshot.musicSeconds,
        paymentId: payment.id,
        note: data.note || null,
      })

      return tx.aiCreditRequest.update({
        where: { id: current.id },
        data: {
          status: 'approved',
          paymentId: payment.id,
          note: data.note || current.note,
          resolvedBy: session.user.id,
          resolvedAt: paidAt,
        },
      })
    })

    return NextResponse.json({ ok: true, request: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : ''
    if (message === 'request_not_found') {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (message === 'request_not_pending') {
      return NextResponse.json({ error: 'La solicitud ya fue resuelta' }, { status: 409 })
    }
    console.error('[admin/ai-credit-requests POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
