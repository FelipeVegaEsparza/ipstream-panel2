import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { streamingClient } from '@/lib/streaming-client'

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effectiveClient = await getEffectiveClient()
    if (!effectiveClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const client = await prisma.client.findUnique({
      where: { id: effectiveClient.clientId },
      select: { timezone: true },
    })

    return NextResponse.json({ timezone: client?.timezone || 'UTC' })
  } catch (error) {
    console.error('Error al obtener timezone:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effectiveClient = await getEffectiveClient()
    if (!effectiveClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { timezone } = body

    if (!timezone || typeof timezone !== 'string' || !isValidTimezone(timezone)) {
      return NextResponse.json({ error: 'Zona horaria inválida' }, { status: 400 })
    }

    await prisma.client.update({
      where: { id: effectiveClient.clientId },
      data: { timezone },
    })

    // Re-alinear los rollups diarios a la nueva zona. El agente recalcula en
    // una transacción: si falla, conserva los rollups anteriores. El error se
    // informa al cliente para que sepa que el histórico diario quedó pendiente.
    let analyticsRecomputed = true
    try {
      await streamingClient.recomputeAnalyticsDaily(effectiveClient.clientId)
    } catch (e) {
      analyticsRecomputed = false
      console.error('No se pudieron recalcular las estadísticas diarias:', e)
    }

    return NextResponse.json({
      success: true,
      timezone,
      analyticsRecomputed,
      ...(analyticsRecomputed ? {} : { warning: 'analytics_recompute_failed' }),
    })
  } catch (error) {
    console.error('Error al actualizar timezone:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
