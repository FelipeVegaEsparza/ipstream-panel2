import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function admin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const categories = await prisma.infoCapsuleCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { capsules: true } } },
  })
  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  try {
    const category = await prisma.infoCapsuleCategory.create({
      data: { name, sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0 },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'category_exists' }, { status: 409 })
  }
}
