// =====================================================
// /api/dashboard/streaming/playlists — GET (list) + POST (create)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { streamingPlaylistCreateSchema } from '@/lib/validations'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.listPlaylists(ctx.clientId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/playlists GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = streamingPlaylistCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    if (!parsed.data.name || !parsed.data.name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const playlistData: { name: string; description?: string; shuffle?: boolean; repeat?: boolean } = {
      name: parsed.data.name,
      description: parsed.data.description,
      shuffle: parsed.data.shuffle,
      repeat: parsed.data.repeat,
    }

    const result = await streamingClient.createPlaylist(ctx.clientId, playlistData)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/playlists POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
