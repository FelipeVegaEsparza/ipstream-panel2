import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import {
  deleteCapsuleAudio,
  getClientTimezone,
  loadCapsuleForClient,
  resolveMusicBuffer,
  serializeCapsule,
} from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

async function invalidate(capsuleId: string, audioUrl: string | null) {
  await prisma.newsCapsule.update({
    where: { id: capsuleId },
    data: {
      status: 'draft',
      approvedAt: null,
      previewedAt: null,
      audioUrl: null,
      audioDuration: null,
      audioVersion: { increment: 1 },
      errorMessage: null,
    },
  })
  await deleteCapsuleAudio(audioUrl)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const last = await prisma.newsCapsuleRun.findFirst({
      where: { capsuleId: capsule.id, status: 'played' },
      orderBy: { playedAt: 'desc' },
      select: { playedAt: true },
    })
    return NextResponse.json({
      capsule: serializeCapsule(capsule, {
        lastPlayedAt: last?.playedAt || null,
        timezone: await getClientTimezone(ctx.clientId),
      }),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/id GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule || capsule.status === 'deleted') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    let invalidateAudio = false

    if (typeof body?.title === 'string' && body.title.trim()) {
      data.title = body.title.trim().slice(0, 191)
    }
    if (typeof body?.sourceText === 'string') {
      data.sourceText = body.sourceText.trim().slice(0, 8000) || null
      invalidateAudio = true
    }
    for (const field of ['summary', 'scriptIntro', 'scriptBody', 'scriptClosing'] as const) {
      if (typeof body?.[field] === 'string') {
        data[field] = body[field].trim().slice(0, 8000) || null
        invalidateAudio = true
      }
    }
    if (body?.musicTrackId !== undefined) {
      const musicTrackId = typeof body.musicTrackId === 'string' && body.musicTrackId ? body.musicTrackId : null
      if (musicTrackId !== capsule.musicTrackId) {
        if (musicTrackId) await resolveMusicBuffer(ctx.clientId, musicTrackId)
        data.musicTrackId = musicTrackId
        invalidateAudio = true
      }
    }
    if (body?.priority !== undefined) {
      const priority = Number(body.priority)
      if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
        return NextResponse.json({ error: 'invalid_priority' }, { status: 400 })
      }
      data.priority = priority
    }
    if (body?.minGapMinutes !== undefined) {
      const value = Number(body.minGapMinutes)
      if (!Number.isInteger(value) || value < 1 || value > 10080) {
        return NextResponse.json({ error: 'invalid_min_gap' }, { status: 400 })
      }
      data.minGapMinutes = value
    }
    if (body?.graceMinutes !== undefined) {
      const value = Number(body.graceMinutes)
      if (!Number.isInteger(value) || value < 1 || value > 120) {
        return NextResponse.json({ error: 'invalid_grace' }, { status: 400 })
      }
      data.graceMinutes = value
    }
    for (const field of ['windowStart', 'windowEnd'] as const) {
      if (body?.[field] !== undefined) {
        const value = typeof body[field] === 'string' ? body[field] : null
        if (value && !TIME.test(value)) {
          return NextResponse.json({ error: 'invalid_window' }, { status: 400 })
        }
        data[field] = value
      }
    }
    for (const field of ['activeFrom', 'activeTo'] as const) {
      if (body?.[field] !== undefined) {
        const value = body[field]
        if (value === null || value === '') data[field] = null
        else {
          const date = new Date(value)
          if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
          data[field] = date
        }
      }
    }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (status === 'paused') data.status = 'paused'
      else if (status === 'draft') data.status = 'draft'
      else if (status === 'approved') {
        if (!capsule.audioUrl || !capsule.previewedAt) {
          return NextResponse.json(
            { error: 'approval_required', message: 'Escuchá y aprobá la cápsula antes de activarla.' },
            { status: 409 }
          )
        }
        data.status = 'approved'
        data.approvedAt = capsule.approvedAt || new Date()
      } else {
        return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
      }
    }

    if (invalidateAudio) {
      await invalidate(capsule.id, capsule.audioUrl)
    }
    if (Object.keys(data).length > 0) {
      await prisma.newsCapsule.update({ where: { id: capsule.id }, data })
    }

    const updated = await loadCapsuleForClient(capsule.id, ctx.clientId)
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({
      capsule: serializeCapsule(updated, { timezone: await getClientTimezone(ctx.clientId) }),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/id PATCH]', err)
    return NextResponse.json(
      { error: 'update_failed', message: err instanceof Error ? err.message : 'No se pudo actualizar.' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const capsule = await loadCapsuleForClient(params.id, ctx.clientId)
    if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    await deleteCapsuleAudio(capsule.audioUrl)
    await prisma.newsCapsuleRule.updateMany({ where: { capsuleId: capsule.id }, data: { active: false } })
    await prisma.newsCapsule.update({
      where: { id: capsule.id },
      data: { status: 'deleted', audioUrl: null, approvedAt: null },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/id DELETE]', err)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
}
