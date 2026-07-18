import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function GET(_request: NextRequest, { params }: { params: { jingleId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return new NextResponse(null, { status: 404 })
    }
    const response = await streamingClient.getJingleCover(ctx.clientId, params.jingleId)
    const blob = await response.blob()
    return new NextResponse(blob, {
      status: 200,
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      if (err.status === 404) {
        return new NextResponse(null, { status: 404 })
      }
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/jingles/cover GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { jingleId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const formData = await request.formData()
    const file = formData.get('cover')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'no_file', message: 'Falta el campo "cover"' }, { status: 400 })
    }
    const result = await streamingClient.uploadJingleCover(ctx.clientId, params.jingleId, file)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/jingles/cover POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { jingleId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.deleteJingleCover(ctx.clientId, params.jingleId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/jingles/cover DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
