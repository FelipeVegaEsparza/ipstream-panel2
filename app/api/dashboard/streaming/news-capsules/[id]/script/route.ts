import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { fetchPublicSource } from '@/lib/news-capsules/source-security'
import { extractArticle } from '@/lib/news-capsules/article'
import { generateNewsScript } from '@/lib/news-capsules/script'
import type { NewsSourceItem } from '@/lib/news-capsules/types'
import {
  deleteCapsuleAudio,
  getClientTimezone,
  loadCapsuleForClient,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule || capsule.status === 'deleted') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const items: NewsSourceItem[] = []
    for (const source of capsule.sources) {
      try {
        const fetched = await fetchPublicSource(source.url)
        const article = extractArticle(fetched.text, fetched.url.toString())
        items.push({
          id: article.id,
          title: article.title,
          url: article.url,
          publisher: article.publisher,
          publishedAt: article.publishedAt,
          excerpt: article.text.slice(0, 1200),
        })
      } catch {
        if (source.title) {
          items.push({
            id: source.guid || source.id,
            title: source.title,
            url: source.url,
            publisher: source.publisher,
            publishedAt: source.publishedAt?.toISOString() || null,
            excerpt: source.excerpt || '',
          })
        }
      }
    }

    const client = await prisma.client.findUnique({
      where: { id: ctx.clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    })
    const stationName = client?.basicData?.projectName || client?.name || 'la radio'
    const script = await generateNewsScript({
      stationName,
      items,
      manualText: capsule.sourceText || undefined,
    })

    await deleteCapsuleAudio(capsule.audioUrl)
    await prisma.newsCapsule.update({
      where: { id: capsule.id },
      data: {
        summary: script.summary,
        scriptIntro: script.intro,
        scriptBody: script.body,
        scriptClosing: script.closing,
        status: 'draft',
        approvedAt: null,
        previewedAt: null,
        audioUrl: null,
        audioDuration: null,
        audioVersion: { increment: 1 },
        errorMessage: null,
      },
    })

    const updated = await loadCapsuleForClient(capsule.id, ctx.clientId)
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({
      capsule: serializeCapsule(updated, { timezone: await getClientTimezone(ctx.clientId) }),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/script]', err)
    return NextResponse.json(
      { error: 'script_failed', message: err instanceof Error ? err.message : 'No se pudo generar el guion.' },
      { status: 502 }
    )
  }
}
