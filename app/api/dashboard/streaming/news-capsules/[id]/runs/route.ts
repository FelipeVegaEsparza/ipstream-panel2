import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await prisma.newsCapsule.findFirst({
      where: { id: params.id, clientId: ctx.clientId },
      select: { id: true },
    })
    if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const runs = await prisma.newsCapsuleRun.findMany({
      where: { capsuleId: capsule.id },
      orderBy: { scheduledFor: 'desc' },
      take: 50,
      select: {
        id: true,
        scheduledFor: true,
        pushedAt: true,
        playedAt: true,
        status: true,
        reason: true,
        trackId: true,
      },
    })
    return NextResponse.json({
      runs: runs.map((run) => ({
        ...run,
        scheduledFor: run.scheduledFor.toISOString(),
        pushedAt: run.pushedAt?.toISOString() || null,
        playedAt: run.playedAt?.toISOString() || null,
      })),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/runs]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
