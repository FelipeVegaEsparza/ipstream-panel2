import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'
const MAX_SIZE = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const form = await request.formData()
    const file = form.get('file')
    const title = typeof form.get('title') === 'string' ? String(form.get('title')).trim().slice(0, 180) : ''
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file_required', message: 'Falta el audio del jingle.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'file_too_large', message: 'El jingle supera 20 MB.' }, { status: 413 })
    }
    const name = (file.name || 'jingle-ia.mp3').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-160) || 'jingle-ia.mp3'
    const upload = new File([await file.arrayBuffer()], name, { type: 'audio/mpeg' })
    const result = await streamingClient.uploadJingle(ctx.clientId, upload)
    const id = result?.jingle?.id
    if (id) {
      await streamingClient.updateJingle(ctx.clientId, id, {
        title: title || 'Jingle IA',
        artist: 'Jingle IA',
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true, jingle: result?.jingle || null })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[jingles/ai/save]', err)
    return NextResponse.json({ error: 'save_failed', message: err instanceof Error ? err.message : 'No se pudo guardar.' }, { status: 500 })
  }
}
