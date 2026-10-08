// =====================================================
// add-client-domain.js — alta/migración de dominio de un cliente
// =====================================================
// Uso (dentro del contenedor del panel, donde está la env y el cliente Prisma):
//   node scripts/add-client-domain.js <clientId|clientName> <hostname> [--kind subdomain|custom] [--primary]
//
// Ejemplos:
//   node scripts/add-client-domain.js cmtezi0... radio-fusion-austral --primary
//   node scripts/add-client-domain.js "Radio Fusion Austral" radiofusion.cl --kind custom
//
// Idempotente: si el hostname ya existe, actualiza tipo/primario sin duplicar.

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

function normalizeHost(raw) {
  if (!raw) return null
  let host = String(raw).trim().toLowerCase()
  if (!host) return null
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  host = host.split('/')[0]
  host = host.replace(/:\d+$/, '')
  host = host.replace(/\.+$/, '')
  return host || null
}

function baseDomain() {
  return (process.env.CLIENT_SITES_DOMAIN || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '')
}

async function main() {
  const [clientRef, rawHostname, ...flags] = process.argv.slice(2)
  if (!clientRef || !rawHostname) {
    console.error('Uso: node scripts/add-client-domain.js <clientId|clientName> <hostname> [--kind subdomain|custom] [--primary]')
    process.exit(1)
  }

  const kind = flags.includes('--kind')
    ? flags[flags.indexOf('--kind') + 1]
    : 'subdomain'
  if (kind !== 'subdomain' && kind !== 'custom') {
    console.error(`Tipo inválido: "${kind}" (usa subdomain o custom)`)
    process.exit(1)
  }
  const isPrimary = flags.includes('--primary')

  let hostname = normalizeHost(rawHostname)
  if (kind === 'subdomain' && hostname && !hostname.includes('.') && baseDomain()) {
    hostname = `${hostname}.${baseDomain()}`
  }
  if (!hostname || !HOST_PATTERN.test(hostname)) {
    console.error(`Hostname inválido: "${rawHostname}"`)
    process.exit(1)
  }

  const client =
    (await prisma.client.findUnique({ where: { id: clientRef } })) ||
    (await prisma.client.findFirst({ where: { name: clientRef } }))
  if (!client) {
    console.error(`Cliente no encontrado: "${clientRef}"`)
    process.exit(1)
  }

  const domain = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.clientDomain.updateMany({
        where: { clientId: client.id },
        data: { isPrimary: false },
      })
    }
    const existing = await tx.clientDomain.findUnique({ where: { hostname } })
    if (existing) {
      return tx.clientDomain.update({
        where: { hostname },
        data: { kind, isPrimary: isPrimary || existing.isPrimary },
      })
    }
    return tx.clientDomain.create({
      data: {
        clientId: client.id,
        hostname,
        kind,
        isPrimary,
        status: 'pending',
        verifyToken: require('crypto').randomBytes(16).toString('hex'),
      },
    })
  })

  console.log(`✓ Dominio ${domain.hostname} (${domain.kind}, ${domain.status}${domain.isPrimary ? ', primario' : ''}) para cliente "${client.name}" (${client.id})`)
}

main()
  .catch((err) => {
    console.error('✗ Error:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
