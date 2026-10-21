import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { StreamingAgentError } from '@/lib/streaming-client'
import { addCapsuleToPlaylist } from '@/lib/info-capsules'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const capsuleId = typeof body?.capsuleId === 'string' ? body.capsuleId : ''
    if (!capsuleId) return NextResponse.json({ error: 'capsule_id_required' }, { status: 400 })
    const result = await addCapsuleToPlaylist({ clientId: ctx.clientId, capsuleId, playlistId: params.id })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    if (err instanceof StreamingAgentError) return NextResponse.json({ error: 'agent_error', message: err.message }, { status: err.status || 502 })
    return NextResponse.json(
      { error: 'add_capsule_failed', message: err instanceof Error ? err.message : 'No se pudo agregar la cápsula' },
      { status: 400 }
    )
  }
}
