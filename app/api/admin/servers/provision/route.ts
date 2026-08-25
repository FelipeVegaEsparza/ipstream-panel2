// =====================================================
// /api/admin/servers/provision — provisioning automático de un nodo
// =====================================================
// Recibe los datos SSH del nuevo VPS, crea el StreamingServer con un token
// nuevo y dispara el job de provisioning en segundo plano.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { streamingServerProvisionSchema } from '@/lib/validations'
import { startNodeProvisioning, isProvisioning } from '@/lib/node-provisioner'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = streamingServerProvisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const data = parsed.data
    if (data.sshAuthType === 'key' && !data.sshPrivateKey) {
      return NextResponse.json({ error: 'ssh_key_required', message: 'Se requiere la clave privada SSH' }, { status: 400 })
    }
    if (data.sshAuthType === 'password' && !data.sshPassword) {
      return NextResponse.json({ error: 'ssh_password_required', message: 'Se requiere el password SSH' }, { status: 400 })
    }

    // Token de agente nuevo para este nodo
    const agentToken = crypto.randomBytes(24).toString('hex')

    const server = await prisma.streamingServer.create({
      data: {
        name: data.name,
        type: data.type,
        baseUrl: `http://${data.sshHost}:4000`,
        tokenEnc: encrypt(agentToken),
        publicHostname: data.publicHostname,
        sshHost: data.sshHost,
        sshPort: data.sshPort,
        sshUser: data.sshUser,
        sshAuthType: data.sshAuthType,
        sshKeyEnc: data.sshPrivateKey ? encrypt(data.sshPrivateKey) : null,
        sshPasswordEnc: data.sshPassword ? encrypt(data.sshPassword) : null,
        provisionStatus: 'none',
        isActive: false,
        isHealthy: false,
      },
    })

    // Disparar provisioning en segundo plano
    await startNodeProvisioning(server.id)

    return NextResponse.json({ ok: true, serverId: server.id, status: 'provisioning' }, { status: 201 })
  } catch (err) {
    console.error('[admin/servers/provision POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
