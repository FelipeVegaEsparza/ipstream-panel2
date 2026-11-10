import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { fetchPublicSource } from '@/lib/news-capsules/source-security'
import { extractArticle } from '@/lib/news-capsules/article'
import {
  defaultCapsuleClosing,
  defaultCapsuleIntro,
  generateNewsItemSummaries,
} from '@/lib/news-capsules/script'
import {
  deleteCapsuleAudio,
  getClientTimezone,
  loadCapsuleForClient,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

async function itemText(item: {
  sourceUrl: string | null
  sourceText: string | null
  title: string
}) {
  if (item.sourceUrl) {
    try {
      const fetched = await fetchPublicSource(item.sourceUrl)
      const article = extractArticle(fetched.text, fetched.url.toString())
      return article.text
    } catch {
      // Fallback al texto guardado si la fuente ya no está disponible.
    }
  }
  if (item.sourceText) return item.sourceText
  return item.title
}

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

    const client = await prisma.client.findUnique({
      where: { id: ctx.clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    })
    const stationName = client?.basicData?.projectName || client?.name || 'la radio'

    // Compatibilidad con cápsulas viejas de un solo cuerpo.
    if (capsule.items.length === 0) {
      const legacyText = capsule.scriptBody || capsule.sourceText || capsule.title
      const legacy = await prisma.newsCapsuleItem.create({
        data: {
          capsuleId: capsule.id,
          order: 0,
          title: capsule.title,
          sourceText: legacyText,
        },
      })
      capsule.items = [legacy as typeof capsule.items[number]]
    }

    const inputs = []
    for (const item of capsule.items) {
      inputs.push({
        title: item.title,
        sourceUrl: item.sourceUrl,
        publisher: item.publisher,
        excerpt: item.sourceText ? item.sourceText.slice(0, 1200) : null,
        text: await itemText(item),
      })
    }
    const summaries = await generateNewsItemSummaries({ stationName, items: inputs })

    await deleteCapsuleAudio(capsule.audioUrl)
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < capsule.items.length; index += 1) {
        await tx.newsCapsuleItem.update({
          where: { id: capsule.items[index].id },
          data: { summary: summaries[index] || null },
        })
      }
      await tx.newsCapsule.update({
        where: { id: capsule.id },
        data: {
          scriptIntro: capsule.scriptIntro || defaultCapsuleIntro(stationName),
          scriptClosing: capsule.scriptClosing || defaultCapsuleClosing(stationName),
          status: 'draft',
          approvedAt: null,
          previewedAt: null,
          audioUrl: null,
          audioDuration: null,
          audioVersion: { increment: 1 },
          errorMessage: null,
        },
      })
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
