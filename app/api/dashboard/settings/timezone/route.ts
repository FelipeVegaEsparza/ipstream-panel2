import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

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
    const session = await getServerSession(authOptions)
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
    const session = await getServerSession(authOptions)
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

    return NextResponse.json({ success: true, timezone })
  } catch (error) {
    console.error('Error al actualizar timezone:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
