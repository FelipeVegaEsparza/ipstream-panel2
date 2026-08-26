// =====================================================
// /api/admin/emails/templates/[id] — PATCH/DELETE plantilla
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailTemplateSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const existing = await prisma.emailTemplate.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'template_not_found' }, { status: 404 })

    const cleaned: any = {}
    if (body.name !== undefined) cleaned.name = String(body.name)
    if (body.description !== undefined) cleaned.description = body.description ?? null
    if (body.subject !== undefined) cleaned.subject = String(body.subject)
    if (body.htmlBody !== undefined) cleaned.htmlBody = String(body.htmlBody)
    if (body.isActive !== undefined) cleaned.isActive = Boolean(body.isActive)

    const template = await prisma.emailTemplate.update({ where: { id: params.id }, data: cleaned })
    return NextResponse.json({ ok: true, template })
  } catch (err) {
    console.error('[emails/templates PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    await prisma.emailTemplate.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[emails/templates DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
