import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import {
  deleteCapsuleAudio,
  getClientTimezone,
  loadCapsuleForClient,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

interface ItemInput {
  order: number
  title: string
  sourceUrl: string | null
  publisher: string | null
  sourceTitle: string | null
  sourceText: string | null
  summary: string | null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule || capsule.status === 'deleted') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const raw: unknown[] = Array.isArray(body?.items) ? body.items.slice(0, 8) : []
    const items = raw
      .map((entry, index: number) => {
        const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
        const title = typeof record.title === 'string' ? record.title.trim().slice(0, 500) : ''
        if (!title) return null
        return {
          order: index,
          title,
          sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl.slice(0, 1000) : null,
          publisher: typeof record.publisher === 'string' ? record.publisher.slice(0, 191) : null,
          sourceTitle: typeof record.sourceTitle === 'string' ? record.sourceTitle.slice(0, 500) : null,
          sourceText: typeof record.text === 'string' ? record.text.slice(0, 8000) : null,
          summary: typeof record.summary === 'string' ? record.summary.slice(0, 300) : null,
        }
      })
      .filter((entry): entry is ItemInput => entry !== null)
    if (items.length === 0) {
      return NextResponse.json({ error: 'items_required', message: 'Agregá al menos una noticia.' }, { status: 400 })
    }

    await deleteCapsuleAudio(capsule.audioUrl)
    await prisma.$transaction(async (tx) => {
      await tx.newsCapsuleItem.deleteMany({ where: { capsuleId: capsule.id } })
      await tx.newsCapsuleItem.createMany({
        data: items.map((item) => ({ ...item, capsuleId: capsule.id })),
      })
      await tx.newsCapsule.update({
        where: { id: capsule.id },
        data: {
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
    console.error('[news-capsules/items]', err)
    return NextResponse.json(
      { error: 'items_failed', message: err instanceof Error ? err.message : 'No se pudieron guardar las noticias.' },
      { status: 400 }
    )
  }
}
