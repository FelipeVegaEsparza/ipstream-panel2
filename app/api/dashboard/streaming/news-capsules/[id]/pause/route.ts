import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getClientTimezone, loadCapsuleForClient, serializeCapsule } from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

export async function POST(
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
    const paused = body?.paused === true
    if (!paused && (!capsule.approvedAt || !capsule.audioUrl)) {
      return NextResponse.json(
        { error: 'approval_required', message: 'Aprobá la cápsula antes de reactivarla.' },
        { status: 409 }
      )
    }
    await prisma.newsCapsule.update({
      where: { id: capsule.id },
      data: { status: paused ? 'paused' : 'approved' },
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
    console.error('[news-capsules/pause]', err)
    return NextResponse.json({ error: 'pause_failed' }, { status: 500 })
  }
}
