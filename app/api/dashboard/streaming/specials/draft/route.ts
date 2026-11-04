// =====================================================
// /api/dashboard/streaming/specials/draft — redactar intro/cierre con IA
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess } from '@/lib/ai-live'
import { isDeepSeekConfigured } from '@/lib/deepseek'
import { generateSpecialText, type SpecialPart } from '@/lib/specials'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json(
        { error: 'ai_not_included', message: 'Tu plan no incluye IA.' },
        { status: 403 }
      )
    }
    if (!(await isDeepSeekConfigured())) {
      return NextResponse.json(
        { error: 'ai_unavailable', message: 'La generación de textos no está configurada en el panel.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const part: SpecialPart = body?.part === 'closing' ? 'closing' : 'intro'
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : ''
    const artist = typeof body?.artist === 'string' ? body.artist.trim().slice(0, 200) : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    if (!name || !description) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Completá el nombre y la descripción del especial.' },
        { status: 400 }
      )
    }

    const text = await generateSpecialText({
      name,
      artist,
      description,
      part,
    })
    if (!text) {
      return NextResponse.json(
        { error: 'generation_failed', message: 'No se pudo redactar el texto. Probá de nuevo.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, part, text })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials draft]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
