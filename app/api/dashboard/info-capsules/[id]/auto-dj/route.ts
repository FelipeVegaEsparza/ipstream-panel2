import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { addCapsuleToPlaylist } from '@/lib/info-capsules'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    let playlistId = typeof body?.playlistId === 'string' ? body.playlistId : ''
    if (!playlistId) {
      const result = await streamingClient.listPlaylists(ctx.clientId)
      const active = (result?.playlists || []).find((playlist: { isActive?: boolean; id?: string }) => playlist.isActive)
      playlistId = active?.id || ''
    }
    if (!playlistId) {
      return NextResponse.json({ error: 'no_active_playlist', message: 'Creá o activá una playlist de AutoDJ.' }, { status: 400 })
    }
    const result = await addCapsuleToPlaylist({ clientId: ctx.clientId, capsuleId: params.id, playlistId })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    if (err instanceof StreamingAgentError) return NextResponse.json({ error: 'agent_error', message: err.message }, { status: err.status || 502 })
    const message = err instanceof Error ? err.message : 'No se pudo agregar la cápsula'
    return NextResponse.json({ error: 'add_capsule_failed', message }, { status: 400 })
  }
}
