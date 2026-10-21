import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'
import { removeCapsuleCopies } from '@/lib/info-capsules'

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const effective = await getEffectiveClient()
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const capsule = await prisma.infoCapsule.findFirst({
    where: { id: params.id, clientId: effective.clientId, source: 'ai' },
    select: { url: true },
  })
  if (!capsule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await removeCapsuleCopies(params.id)
  await prisma.infoCapsule.delete({ where: { id: params.id } })
  await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'info-capsules', path.basename(capsule.url))).catch(() => {})
  return NextResponse.json({ ok: true })
}
