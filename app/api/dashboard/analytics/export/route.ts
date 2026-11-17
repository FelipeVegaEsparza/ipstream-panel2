import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { isService, resolveAnalyticsQuery, buildSeries, toCsv } from '@/lib/analytics'

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

    return new NextResponse(toCsv(points), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="estadisticas-${service}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[analytics/export]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
