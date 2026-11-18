import { NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getReferralDashboard } from '@/lib/referrals/dashboard'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const effective = await getEffectiveClient()
    if (!effective?.clientId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await getReferralDashboard(effective.clientId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error obteniendo el programa de referidos:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
