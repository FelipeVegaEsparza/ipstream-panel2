import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { prisma } from '@/lib/prisma'
import { prepareScheduledPlaylistNow } from '@/lib/ai-intro-poller'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const schedule = await prisma.playlistSchedule.findFirst({
      where: { id: params.id, clientId: ctx.clientId },
      select: { playlistId: true },
    })
    const result = await streamingClient.updateSchedule(ctx.clientId, params.id, body)
    const playlistId =
      typeof body.playlistId === 'string' ? body.playlistId : schedule?.playlistId
    if (playlistId) void prepareScheduledPlaylistNow(ctx.clientId, playlistId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/schedule PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.deleteSchedule(ctx.clientId, params.id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/schedule DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
