import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAdminReferralData } from '@/lib/referrals/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const data = await getAdminReferralData({
      query: url.searchParams.get('query') || undefined,
      status: url.searchParams.get('status') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 200),
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listando referidos (admin):', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
