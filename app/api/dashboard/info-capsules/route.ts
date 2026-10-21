import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const MAX_SELECTION = 200

export async function GET() {
  const effective = await getEffectiveClient()
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const [capsules, selections] = await Promise.all([
    prisma.infoCapsule.findMany({
      where: { active: true, OR: [{ categoryId: null }, { category: { active: true } }] },
      orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
      select: {
        id: true, title: true, description: true, fileName: true, mimeType: true,
        url: true, size: true, duration: true, createdAt: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.clientInfoCapsule.findMany({
      where: { clientId: effective.clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { capsuleId: true },
    }),
  ])
  const categories = await prisma.infoCapsuleCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })
  return NextResponse.json({
    capsules,
    categories,
    selectedIds: selections.map((row) => row.capsuleId),
  })
}

export async function PUT(request: NextRequest) {
  const effective = await getEffectiveClient()
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const rawIds = Array.isArray(body?.capsuleIds) ? body.capsuleIds : null
  if (!rawIds || rawIds.some((id: unknown) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'invalid_capsule_ids' }, { status: 400 })
  }
  const capsuleIds = Array.from(new Set<string>(rawIds)).slice(0, MAX_SELECTION)
  const valid = await prisma.infoCapsule.findMany({
    where: { id: { in: capsuleIds }, active: true },
    select: { id: true },
  })
  const validSet = new Set(valid.map((capsule) => capsule.id))
  const ordered = capsuleIds.filter((id) => validSet.has(id))
  await prisma.$transaction(async (tx) => {
    await tx.clientInfoCapsule.deleteMany({ where: { clientId: effective.clientId } })
    if (ordered.length) {
      await tx.clientInfoCapsule.createMany({
        data: ordered.map((capsuleId, sortOrder) => ({ clientId: effective.clientId, capsuleId, sortOrder })),
      })
    }
  })
  return NextResponse.json({ selectedIds: ordered })
}
