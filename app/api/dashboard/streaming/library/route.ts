// =====================================================
// /api/dashboard/streaming/library — GET (list) + POST (upload)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { checkStorageQuota } from '@/lib/streaming-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.listLibrary(ctx.clientId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/library GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    // Phase 7: kill switch
    const enabled = (await prisma.radioStream.findUnique({
      where: { clientId: ctx.clientId },
      select: { enabled: true },
    }))?.enabled
    if (enabled === false) {
      return NextResponse.json({
        error: 'streaming_disabled',
        message: 'Tu streaming fue deshabilitado por el administrador.',
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({
        error: 'no_file',
        message: 'Falta el campo "file"',
      }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({
        error: 'file_too_large',
        message: 'Máximo 50 MB',
      }, { status: 413 })
    }

    // Phase 7: enforcement de storage quota
    const quotaError = await checkStorageQuota(ctx.clientId, file.size)
    if (quotaError) {
      return NextResponse.json({
        error: 'quota_exceeded',
        message: quotaError,
      }, { status: 413 })
    }

    const result = await streamingClient.uploadTrack(ctx.clientId, file)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/library POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
