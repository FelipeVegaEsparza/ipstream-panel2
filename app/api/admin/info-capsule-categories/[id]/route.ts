import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function admin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 120)
  if (typeof body?.active === 'boolean') data.active = body.active
  if (Number.isFinite(Number(body?.sortOrder))) data.sortOrder = Number(body.sortOrder)
  if (typeof body?.defaultForAi === 'boolean') data.defaultForAi = body.defaultForAi
  if (!Object.keys(data).length) return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  try {
    const category = await prisma.$transaction(async (tx) => {
      if (data.defaultForAi === true) {
        await tx.infoCapsuleCategory.updateMany({ where: { id: { not: params.id } }, data: { defaultForAi: false } })
      }
      return tx.infoCapsuleCategory.update({ where: { id: params.id }, data })
    })
    return NextResponse.json({ category })
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await prisma.infoCapsuleCategory.delete({ where: { id: params.id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
