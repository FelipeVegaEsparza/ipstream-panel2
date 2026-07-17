import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CHAT_MESSAGE_RETENTION_HOURS } from '@/lib/chat-helpers'

export const dynamic = 'force-dynamic'

/**
 * Cron que borra mensajes de chat con más de 48h de antigüedad.
 * Configurar para correr cada 1h en el proveedor (Vercel Cron / externo).
 *
 * Header requerido: Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cutoff = new Date(Date.now() - CHAT_MESSAGE_RETENTION_HOURS * 60 * 60 * 1000)

    const result = await prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      retentionHours: CHAT_MESSAGE_RETENTION_HOURS,
      cutoff: cutoff.toISOString(),
    })
  } catch (error) {
    console.error('Error in chat cleanup cron:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Permitir GET para testing manual desde el navegador
export async function GET(request: NextRequest) {
  return POST(request)
}
