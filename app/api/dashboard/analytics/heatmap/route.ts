import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { isService, resolveRange, getHeatmap, getClientTimezone } from '@/lib/analytics'

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
    const { matrix, max } = await getHeatmap(effective.clientId, service, range.from, range.to, tz)

    return NextResponse.json({ service, timezone: tz, matrix, max })
  } catch (error) {
    console.error('[analytics/heatmap]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
