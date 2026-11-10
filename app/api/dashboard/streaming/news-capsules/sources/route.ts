import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { rateLimit } from '@/lib/rate-limit'
import { fetchPublicSource, SourceError } from '@/lib/news-capsules/source-security'
import { parseFeed } from '@/lib/news-capsules/feed'
import { extractArticle } from '@/lib/news-capsules/article'

export const dynamic = 'force-dynamic'

function looksLikeFeed(contentType: string, text: string): boolean {
  const type = contentType.toLowerCase()
  if (type.includes('rss') || type.includes('atom') || type.includes('xml')) return true
  return /^\s*(<\?xml|<rss|<feed)/i.test(text)
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const { allowed } = await rateLimit({
      maxRequests: 30,
      windowMs: 60 * 60 * 1000,
      identifier: `news-source:${ctx.clientId}`,
    })
    if (!allowed) {
      return NextResponse.json({ error: 'rate_limited', message: 'Demasiadas consultas. Probá más tarde.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url) return NextResponse.json({ error: 'url_required', message: 'Ingresá una URL.' }, { status: 400 })

    const fetched = await fetchPublicSource(url)
    if (looksLikeFeed(fetched.contentType, fetched.text)) {
      const feed = parseFeed(fetched.text, fetched.url.toString())
      return NextResponse.json({ kind: 'feed', publisher: feed.publisher, items: feed.items })
    }

    const article = extractArticle(fetched.text, fetched.url.toString())
    return NextResponse.json({
      kind: 'article',
      publisher: article.publisher,
      items: [
        {
          id: article.id,
          title: article.title,
          url: article.url,
          publisher: article.publisher,
          publishedAt: article.publishedAt,
          excerpt: article.excerpt,
        },
      ],
      articleText: article.text,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof SourceError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status })
    }
    console.error('[news-capsules/sources]', err)
    return NextResponse.json(
      { error: 'source_failed', message: err instanceof Error ? err.message : 'No se pudo leer la fuente.' },
      { status: 502 }
    )
  }
}
