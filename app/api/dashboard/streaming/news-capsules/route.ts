import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { isDuplicateSource } from '@/lib/news-capsules/dedupe'
import {
  getClientTimezone,
  getLastPlayedMap,
  loadCapsuleForClient,
  resolveMusicBuffer,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

interface NewSourceInput {
  title: string
  url: string
  publisher: string | null
  publishedAt: string | null
  guid: string | null
  excerpt: string | null
}

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [capsules, timezone] = await Promise.all([
      prisma.newsCapsule.findMany({
        where: { clientId: ctx.clientId, status: { not: 'deleted' } },
        orderBy: { updatedAt: 'desc' },
        include: {
          sources: { orderBy: { createdAt: 'asc' } },
          rules: { orderBy: { createdAt: 'asc' } },
          musicTrack: { select: { id: true, name: true, artist: true } },
        },
      }),
      getClientTimezone(ctx.clientId),
    ])
    const lastPlayed = await getLastPlayedMap(capsules.map((capsule) => capsule.id))
    return NextResponse.json({
      capsules: capsules.map((capsule) =>
        serializeCapsule(capsule, { lastPlayedAt: lastPlayed.get(capsule.id) || null, timezone })
      ),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items.slice(0, 5) : []
    const items = rawItems
      .map((item) => {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
        const title = typeof record.title === 'string' ? record.title.trim().slice(0, 500) : ''
        const url = typeof record.url === 'string' ? record.url.trim().slice(0, 1000) : ''
        if (!title || !url) return null
        return {
          title,
          url,
          publisher: typeof record.publisher === 'string' ? record.publisher.trim().slice(0, 191) : null,
          publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : null,
          guid: typeof record.guid === 'string' ? record.guid.slice(0, 500) : null,
          excerpt: typeof record.excerpt === 'string' ? record.excerpt.slice(0, 2000) : null,
        }
      })
      .filter((item): item is NewSourceInput => item !== null)
    const manualText = typeof body?.manualText === 'string' ? body.manualText.trim().slice(0, 8000) : ''
    if (items.length === 0 && !manualText) {
      return NextResponse.json(
        { error: 'content_required', message: 'Elegí una noticia o escribí el texto de la cápsula.' },
        { status: 400 }
      )
    }
    const title = (
      typeof body?.title === 'string' && body.title.trim()
        ? body.title.trim()
        : items[0]?.title || 'Cápsula de noticias'
    ).slice(0, 191)
    const musicTrackId = typeof body?.musicTrackId === 'string' && body.musicTrackId ? body.musicTrackId : null
    if (musicTrackId) await resolveMusicBuffer(ctx.clientId, musicTrackId)

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const existingSources = await prisma.newsCapsuleSource.findMany({
      where: { capsule: { clientId: ctx.clientId }, createdAt: { gte: since } },
      select: { url: true, guid: true, title: true },
    })
    const uniqueItems = items.filter(
      (item) => !isDuplicateSource({ url: item.url, guid: item.guid, title: item.title }, existingSources)
    )
    if (items.length > 0 && uniqueItems.length === 0) {
      return NextResponse.json(
        { error: 'duplicate_source', message: 'Esa noticia ya fue usada en una cápsula reciente.' },
        { status: 409 }
      )
    }

    const created = await prisma.newsCapsule.create({
      data: {
        clientId: ctx.clientId,
        title,
        status: 'draft',
        sourceText: manualText || null,
        musicTrackId,
        sources: {
          create: uniqueItems.map((item) => ({
            url: item.url,
            title: item.title,
            publisher: item.publisher,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
            guid: item.guid,
            excerpt: item.excerpt,
          })),
        },
      },
    })
    const capsule = await loadCapsuleForClient(created.id, ctx.clientId)
    if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(
      { capsule: serializeCapsule(capsule, { timezone: await getClientTimezone(ctx.clientId) }) },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules POST]', err)
    return NextResponse.json(
      { error: 'create_failed', message: err instanceof Error ? err.message : 'No se pudo crear la cápsula.' },
      { status: 400 }
    )
  }
}
