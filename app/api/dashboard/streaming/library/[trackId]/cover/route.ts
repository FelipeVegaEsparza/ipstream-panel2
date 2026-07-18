import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return new NextResponse(null, { status: 404 })
    }

    const agentRes = await streamingClient.getCover(ctx.clientId, params.trackId)

    if (!agentRes.ok) {
      if (agentRes.status === 404) {
        return new NextResponse(null, { status: 404 })
      }
      return new NextResponse(null, { status: agentRes.status })
    }

    const contentType = agentRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await agentRes.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[cover GET]', err)
    return new NextResponse(null, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'unsupported_media_type', message: 'Solo se aceptan imágenes' }, { status: 415 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large', message: 'Máximo 2 MB' }, { status: 413 })
    }

    const result = await streamingClient.uploadCover(ctx.clientId, params.trackId, file)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[cover POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const result = await streamingClient.deleteCover(ctx.clientId, params.trackId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[cover DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
