import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_EFFECTS = 20

export async function GET() {
  const effective = await getEffectiveClient()
  if (!effective) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const [effects, selections] = await Promise.all([
    prisma.soundEffect.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, fileName: true, mimeType: true,
        url: true, size: true, createdAt: true,
      },
    }),
    prisma.clientSoundEffect.findMany({
      where: { clientId: effective.clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { effectId: true },
    }),
  ])
  return NextResponse.json({
    effects,
    selectedIds: selections.map((row) => row.effectId),
  })
}

export async function PUT(request: NextRequest) {
  const effective = await getEffectiveClient()
  if (!effective) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const rawIds = Array.isArray(body?.effectIds) ? body.effectIds : null
  if (!rawIds || rawIds.some((id: unknown) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'invalid_effect_ids' }, { status: 400 })
  }
  const effectIds = Array.from(new Set<string>(rawIds)).slice(0, MAX_EFFECTS)
  const valid = await prisma.soundEffect.findMany({
    where: { id: { in: effectIds }, active: true },
    select: { id: true },
  })
  const validSet = new Set(valid.map((effect) => effect.id))
  const ordered = effectIds.filter((id) => validSet.has(id))
  await prisma.$transaction(async (tx) => {
    await tx.clientSoundEffect.deleteMany({ where: { clientId: effective.clientId } })
    if (ordered.length > 0) {
      await tx.clientSoundEffect.createMany({
        data: ordered.map((effectId, sortOrder) => ({
          clientId: effective.clientId,
          effectId,
          sortOrder,
        })),
      })
    }
  })
  return NextResponse.json({ selectedIds: ordered })
}
