// =====================================================
// /api/admin/emails/templates — CRUD de plantillas de correo
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

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { key: 'asc' },
  })
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = emailTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { key: parsed.data.key } })
    if (existing) {
      return NextResponse.json({ error: 'key_exists', message: 'Ya existe una plantilla con esa key' }, { status: 409 })
    }

    const d = parsed.data
    const template = await prisma.emailTemplate.create({
      data: {
        key: d.key,
        name: d.name,
        description: d.description ?? null,
        subject: d.subject,
        htmlBody: d.htmlBody,
        isActive: d.isActive,
      },
    })
    return NextResponse.json({ ok: true, template }, { status: 201 })
  } catch (err) {
    console.error('[emails/templates POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
