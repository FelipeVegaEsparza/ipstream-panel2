import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { isService, resolveRange, topTracks, topArtists, topVideos, topDjs } from '@/lib/analytics'

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
    const kind = sp.get('kind') || (service === 'tv' ? 'videos' : 'tracks')
    const range = resolveRange(sp)
    const clientId = effective.clientId

    let items: unknown = []
    if (kind === 'tracks') items = await topTracks(clientId, range.from, range.to)
    else if (kind === 'artists') items = await topArtists(clientId, range.from, range.to)
    else if (kind === 'videos') items = await topVideos(clientId, range.from, range.to)
    else if (kind === 'djs') items = await topDjs(clientId, range.from, range.to)
    else return NextResponse.json({ error: 'kind_invalido' }, { status: 400 })

    return NextResponse.json({ service, kind, items })
  } catch (error) {
    console.error('[analytics/top]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
