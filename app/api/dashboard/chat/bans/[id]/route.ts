import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const existing = await prisma.chatBan.findFirst({
      where: { id: params.id, clientId: effective.clientId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ban no encontrado' }, { status: 404 })
    }

    await prisma.chatBan.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting chat ban:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
