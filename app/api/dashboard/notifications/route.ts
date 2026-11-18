import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const effective = await getEffectiveClient()
    if (!effective?.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') || 50)
    const unreadOnly = url.searchParams.get('unread') === '1'

    const [notifications, unread] = await Promise.all([
      listNotifications(effective.clientId, { limit, unreadOnly }),
      getUnreadNotificationCount(effective.clientId),
    ])

    return NextResponse.json({ notifications, unread })
  } catch (error) {
    console.error('Error listando notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const effective = await getEffectiveClient()
    if (!effective?.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.all === true) {
      const result = await markAllRead(effective.clientId)
      return NextResponse.json({ ok: true, count: result?.count ?? 0 })
    }

    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const result = await markNotificationRead(effective.clientId, id)
    return NextResponse.json({ ok: true, count: result?.count ?? 0 })
  } catch (error) {
    console.error('Error actualizando notificaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
