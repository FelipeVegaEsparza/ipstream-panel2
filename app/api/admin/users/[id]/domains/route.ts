import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { CLIENT_SITES_DOMAIN, normalizeHost, clearClientDomainCache } from '@/lib/client-domains'

const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

const createSchema = z.object({
  hostname: z.string().min(1, 'El dominio es requerido'),
  kind: z.enum(['subdomain', 'custom']).default('subdomain'),
  isPrimary: z.boolean().optional().default(false),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session
}

async function clientIdForUser(userId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  })
  return client?.id ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const clientId = await clientIdForUser(params.id)
  if (!clientId) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const domains = await prisma.clientDomain.findMany({
    where: { clientId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ domains })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const clientId = await clientIdForUser(params.id)
  if (!clientId) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  let hostname = normalizeHost(parsed.data.hostname)
  // Subdominio abreviado: "radio-x" → "radio-x.<CLIENT_SITES_DOMAIN>".
  if (
    hostname &&
    parsed.data.kind === 'subdomain' &&
    !hostname.includes('.') &&
    CLIENT_SITES_DOMAIN
  ) {
    hostname = `${hostname}.${CLIENT_SITES_DOMAIN}`
  }
  if (!hostname || !HOST_PATTERN.test(hostname)) {
    return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
  }

  const existing = await prisma.clientDomain.findUnique({ where: { hostname } })
  if (existing) {
    return NextResponse.json(
      { error: 'Ese dominio ya está registrado' },
      { status: 409 }
    )
  }

  const verifyToken = crypto.randomBytes(16).toString('hex')

  const domain = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.clientDomain.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      })
    }
    return tx.clientDomain.create({
      data: {
        clientId,
        hostname,
        kind: parsed.data.kind,
        isPrimary: parsed.data.isPrimary,
        verifyToken,
        status: 'pending',
      },
    })
  })

  clearClientDomainCache(hostname)
  return NextResponse.json({ domain }, { status: 201 })
}
