import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getStorageUsage } from '@/lib/streaming-helpers'

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const usage = await getStorageUsage(ctx.clientId)
    return NextResponse.json(usage)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[library/storage GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
