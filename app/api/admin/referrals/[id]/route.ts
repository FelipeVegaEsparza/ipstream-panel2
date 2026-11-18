import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAdminReferralDetail } from '@/lib/referrals/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const detail = await getAdminReferralDetail(params.id)
    if (!detail) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (error) {
    console.error('Error obteniendo detalle de referido:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
