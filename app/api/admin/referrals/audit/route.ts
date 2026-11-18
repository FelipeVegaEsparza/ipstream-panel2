import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAdminAudit } from '@/lib/referrals/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const url = new URL(request.url)
    const audit = await getAdminAudit({
      query: url.searchParams.get('query') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      pageSize: Number(url.searchParams.get('pageSize') || 200),
    })
    return NextResponse.json({ audit })
  } catch (error) {
    console.error('Error listando auditoría de referidos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
