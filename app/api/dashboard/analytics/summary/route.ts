import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import {
  isService,
  resolveRange,
  inferGranularity,
  buildSeries,
  summarize,
  getUniqueListeners,
  getClientTimezone,
} from '@/lib/analytics'

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

    const range = resolveRange(sp)
    const tz = await getClientTimezone(effective.clientId)
    const granularity = inferGranularity(range, sp.get('granularity'))

    const points = await buildSeries(effective.clientId, service, range, granularity, tz)
    const prevPoints = await buildSeries(
      effective.clientId,
      service,
      { from: range.prevFrom, to: range.prevTo },
      granularity,
      tz
    )
    const unique = await getUniqueListeners(effective.clientId, service, range.from, range.to)

    return NextResponse.json({
      period: range.period,
      service,
      granularity,
      timezone: tz,
      from: range.from,
      to: range.to,
      summary: summarize(points, unique),
      previous: summarize(prevPoints, 0),
    })
  } catch (error) {
    console.error('[analytics/summary]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
