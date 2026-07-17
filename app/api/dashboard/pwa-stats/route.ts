import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export async function GET() {
  try {
    const effectiveClient = await getEffectiveClient()

    if (!effectiveClient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const count = await prisma.pwaInstall.count({
      where: { clientId: effectiveClient.clientId },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching PWA stats:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
