import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getClientTimezone, loadCapsuleForClient, serializeCapsule } from '@/lib/news-capsules/service'

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
      return NextResponse.json(
        { error: 'audio_required', message: 'Generá el audio antes de aprobar.' },
        { status: 409 }
      )
    }
    if (!capsule.previewedAt) {
      return NextResponse.json(
        { error: 'preview_required', message: 'Escuchá el preview antes de aprobar.' },
        { status: 409 }
      )
    }
    await prisma.newsCapsule.update({
      where: { id: capsule.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedVersion: capsule.audioVersion,
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
    console.error('[news-capsules/approve]', err)
    return NextResponse.json({ error: 'approve_failed' }, { status: 500 })
  }
}
