import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { loadCapsuleForClient } from '@/lib/news-capsules/service'

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
    if (!capsule.audioUrl) {
      return NextResponse.json({ error: 'audio_required', message: 'Generá el audio primero.' }, { status: 409 })
    }
    const previewedAt = new Date()
    await prisma.newsCapsule.update({ where: { id: capsule.id }, data: { previewedAt } })
    return NextResponse.json({ ok: true, previewedAt: previewedAt.toISOString() })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/preview]', err)
    return NextResponse.json({ error: 'preview_failed' }, { status: 500 })
  }
}
