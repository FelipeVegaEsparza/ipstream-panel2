import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CHAT_MESSAGE_RETENTION_HOURS } from '@/lib/chat-helpers'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function isAuthorized(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice('Bearer '.length)
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

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

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    if (!isAuthorized(authHeader, cronSecret)) {
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

// GET no permitido: la limpieza es una operación destructiva, solo POST protegido
export async function GET() {
  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
}
