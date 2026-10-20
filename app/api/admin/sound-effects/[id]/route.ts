import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const effect = await prisma.soundEffect.findUnique({
    where: { id: params.id },
    select: { id: true, url: true },
  })
  if (!effect) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await prisma.soundEffect.delete({ where: { id: effect.id } })
  const storedName = path.basename(effect.url)
  await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'sound-effects', storedName)).catch(() => {})
  return NextResponse.json({ ok: true })
}
