import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getClientTimezone, loadCapsuleForClient, parseRuleInput, serializeCapsule } from '@/lib/news-capsules/service'

export const dynamic = 'force-dynamic'

export async function PUT(
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
    if (capsule.status !== 'approved' || !capsule.approvedAt || !capsule.audioUrl) {
      return NextResponse.json(
        { error: 'approval_required', message: 'Aprobá la cápsula antes de programarla.' },
        { status: 409 }
      )
    }
    const body = await request.json().catch(() => ({}))
    const rules = parseRuleInput(body?.rules)
    await prisma.$transaction(async (tx) => {
      await tx.newsCapsuleRule.deleteMany({ where: { capsuleId: capsule.id } })
      for (const rule of rules) {
        await tx.newsCapsuleRule.create({
          data: {
            capsuleId: capsule.id,
            kind: rule.kind,
            config: JSON.stringify(rule.config),
            days: rule.days ? JSON.stringify(rule.days) : null,
            active: rule.active,
          },
        })
      }
    })
    const updated = await loadCapsuleForClient(capsule.id, ctx.clientId)
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({
      capsule: serializeCapsule(updated, { timezone: await getClientTimezone(ctx.clientId) }),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[news-capsules/rules]', err)
    return NextResponse.json(
      { error: 'rules_failed', message: err instanceof Error ? err.message : 'Reglas inválidas.' },
      { status: 400 }
    )
  }
}
