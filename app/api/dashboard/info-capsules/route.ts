import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'
import { streamingClient } from '@/lib/streaming-client'
import { ensureCapsuleCopy } from '@/lib/info-capsules'

export const dynamic = 'force-dynamic'
const MAX_SELECTION = 200

export async function GET() {
  const effective = await getEffectiveClient()
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const [capsules, selections, radioStream] = await Promise.all([
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
    prisma.radioStream.findUnique({
      where: { clientId: effective.clientId },
      select: { capsuleAutoDjEnabled: true, capsulePlayEvery: true, capsulePlayCount: true },
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
    autoDjEnabled: Boolean(radioStream?.capsuleAutoDjEnabled),
    playEvery: radioStream?.capsulePlayEvery ?? 8,
    playCount: radioStream?.capsulePlayCount ?? 1,
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
  const autoDjEnabled = Boolean(body?.autoDjEnabled)
  const playEvery = Math.max(1, Math.min(100, Math.floor(Number(body?.playEvery) || 8)))
  const playCount = Math.max(1, Math.min(20, Math.floor(Number(body?.playCount) || 1)))
  const capsuleIds = Array.from(new Set<string>(rawIds)).slice(0, MAX_SELECTION)
  const valid = await prisma.infoCapsule.findMany({
    where: { id: { in: capsuleIds }, active: true },
    select: { id: true },
  })
  const validSet = new Set(valid.map((capsule) => capsule.id))
  const ordered = capsuleIds.filter((id) => validSet.has(id))

  if (autoDjEnabled) {
    const radioStream = await prisma.radioStream.findUnique({
      where: { clientId: effective.clientId }, select: { id: true },
    })
    if (!radioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    for (const capsuleId of ordered) {
      try {
        await ensureCapsuleCopy(effective.clientId, capsuleId)
      } catch (err) {
        return NextResponse.json(
          {
            error: 'capsule_copy_failed',
            message: err instanceof Error && err.message === 'capsule_must_be_mp3'
              ? 'Para AutoDJ, todas las cápsulas seleccionadas deben ser MP3.'
              : 'No se pudo preparar una cápsula para AutoDJ.',
          },
          { status: 400 }
        )
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.clientInfoCapsule.deleteMany({ where: { clientId: effective.clientId } })
    if (ordered.length) {
      await tx.clientInfoCapsule.createMany({
        data: ordered.map((capsuleId, sortOrder) => ({ clientId: effective.clientId, capsuleId, sortOrder })),
      })
    }
    await tx.radioStream.updateMany({
      where: { clientId: effective.clientId },
      data: {
        capsuleAutoDjEnabled: autoDjEnabled,
        capsulePlayEvery: playEvery,
        capsulePlayCount: playCount,
      },
    })
  })

  try {
    await streamingClient.regenerateM3u(effective.clientId)
  } catch (err) {
    console.warn('[info-capsules] no se pudo regenerar M3U:', err)
  }

  return NextResponse.json({ selectedIds: ordered, autoDjEnabled, playEvery, playCount })
}
