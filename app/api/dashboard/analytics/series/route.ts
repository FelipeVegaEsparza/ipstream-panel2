import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { isService, resolveAnalyticsQuery, buildSeries } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const service = sp.get('service') || 'radio'
    if (!isService(service)) {
      return NextResponse.json({ error: 'service_invalido' }, { status: 400 })
    }

    const { tz, range, granularity } = await resolveAnalyticsQuery(sp, effective.clientId)
    const points = await buildSeries(effective.clientId, service, range, granularity, tz)

    return NextResponse.json({
      period: range.period,
      service,
      granularity,
      timezone: tz,
      from: range.from,
      to: range.to,
      points,
    })
  } catch (error) {
    console.error('[analytics/series]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
