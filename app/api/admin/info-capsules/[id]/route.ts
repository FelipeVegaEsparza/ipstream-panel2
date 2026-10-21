import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { streamingClient } from '@/lib/streaming-client'

async function admin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

async function removeCopies(capsuleId: string) {
  const tracks = await prisma.track.findMany({
    where: { capsuleId },
    select: { id: true, clientId: true },
  })
  for (const track of tracks) {
    await streamingClient.deleteTrack(track.clientId, track.id).catch(() => {})
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body?.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 191)
  if (typeof body?.description === 'string') data.description = body.description.trim().slice(0, 2000) || null
  if (body?.categoryId === null || typeof body?.categoryId === 'string') data.categoryId = body.categoryId || null
  if (typeof body?.active === 'boolean') data.active = body.active
  if (!Object.keys(data).length) return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  if (data.active === false) {
    await prisma.clientInfoCapsule.deleteMany({ where: { capsuleId: params.id } })
    await removeCopies(params.id)
  }
  const capsule = await prisma.infoCapsule.update({
    where: { id: params.id },
    data,
    include: { category: { select: { id: true, name: true } } },
  }).catch(() => null)
  if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ capsule })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const capsule = await prisma.infoCapsule.findUnique({ where: { id: params.id }, select: { url: true } })
  if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await removeCopies(params.id)
  await prisma.infoCapsule.delete({ where: { id: params.id } }).catch(() => {})
  await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'info-capsules', path.basename(capsule.url))).catch(() => {})
  return NextResponse.json({ ok: true })
}
