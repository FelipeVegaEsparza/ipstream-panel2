import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const data: { name?: string; artist?: string | null; active?: boolean } = {}
  if (typeof body?.name === 'string') {
    const name = body.name.trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
    data.name = name
  }
  if ('artist' in (body || {})) {
    data.artist = typeof body.artist === 'string' ? body.artist.trim().slice(0, 120) || null : null
  }
  if (typeof body?.active === 'boolean') data.active = body.active
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  try {
    const track = await prisma.musicTrack.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, artist: true, active: true },
    })
    return NextResponse.json({ track })
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const track = await prisma.musicTrack.findUnique({
    where: { id: params.id },
    select: { id: true, url: true },
  })
  if (!track) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  await prisma.musicTrack.delete({ where: { id: track.id } })
  const storedName = path.basename(track.url)
  await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'music', storedName)).catch(() => {})
  return NextResponse.json({ ok: true })
}
