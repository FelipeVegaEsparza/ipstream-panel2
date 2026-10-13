import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getChatStats } from '@/lib/chat-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    const stats = await getChatStats(effective.clientId)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error getting chat stats:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
