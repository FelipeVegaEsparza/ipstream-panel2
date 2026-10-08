import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { clearClientDomainCache } from '@/lib/client-domains'
import { startDomainProvisioning, startDomainVerification } from '@/lib/domain-provisioner'

const patchSchema = z.object({
  status: z.enum(['pending', 'active', 'error']).optional(),
  isPrimary: z.boolean().optional(),
  kind: z.enum(['subdomain', 'custom']).optional(),
})

const actionSchema = z.object({
  action: z.enum(['provision', 'verify']),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session
}

async function findDomainForUser(userId: string, domainId: string) {
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!client) return null
  const domain = await prisma.clientDomain.findFirst({
    where: { id: domainId, clientId: client.id },
  })
  return domain
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; domainId: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const domain = await findDomainForUser(params.id, params.domainId)
  if (!domain) {
    return NextResponse.json({ error: 'Dominio no encontrado' }, { status: 404 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary === true) {
      await tx.clientDomain.updateMany({
        where: { clientId: domain.clientId },
        data: { isPrimary: false },
      })
    }
    return tx.clientDomain.update({
      where: { id: domain.id },
      data: {
        status: parsed.data.status,
        isPrimary: parsed.data.isPrimary,
        kind: parsed.data.kind,
      },
    })
  })

  clearClientDomainCache(domain.hostname)
  return NextResponse.json({ domain: updated })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; domainId: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const domain = await findDomainForUser(params.id, params.domainId)
  if (!domain) {
    return NextResponse.json({ error: 'Dominio no encontrado' }, { status: 404 })
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  if (parsed.data.action === 'provision') {
    startDomainProvisioning(domain.id)
  } else {
    startDomainVerification(domain.id)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; domainId: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const domain = await findDomainForUser(params.id, params.domainId)
  if (!domain) {
    return NextResponse.json({ error: 'Dominio no encontrado' }, { status: 404 })
  }

  await prisma.clientDomain.delete({ where: { id: domain.id } })
  clearClientDomainCache(domain.hostname)
  return NextResponse.json({ ok: true })
}
