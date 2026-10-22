#!/usr/bin/env node
// =====================================================
// CasterFly — migración de dominios de clientes
// =====================================================
// Idempotente. Por defecto corre en dry-run; con --apply escribe.
//
//   node scripts/migrate-casterfly-domains.js
//   node scripts/migrate-casterfly-domains.js --apply
//
// Qué hace:
//   1. app_config.clientSitesDomain = casterfly.com
//      app_config.clientSitesTarget = clientes.casterfly.com
//   2. Para cada client_domains kind=subdomain con host label.ipstream.cl:
//      crea/activa label.casterfly.com como primario y deja el host viejo
//      como alias activo no primario.
//   3. Actualiza BasicData.websiteUrl cuando apunta al host viejo.
//   4. Actualiza el servidor principal de streaming a stream.casterfly.com.
//
// No toca dominios custom ni servidores remotos con otro hostname.

const OLD_BASE = 'ipstream.cl'
const NEW_BASE = 'casterfly.com'
const NEW_TARGET = `clientes.${NEW_BASE}`
const OLD_PANEL_HOST = 'panelipstream.cl'
const OLD_STREAM_HOST = 'stream.panelipstream.cl'
const NEW_STREAM_HOST = `stream.${NEW_BASE}`

function normalizeHost(value) {
  return String(value || '').trim().toLowerCase().replace(/\.+$/, '')
}

/** Devuelve la etiqueta de un subdominio directo del dominio base, o null. */
function platformLabel(hostname, base) {
  const host = normalizeHost(hostname)
  if (!host.endsWith(`.${base}`)) return null
  const label = host.slice(0, -(base.length + 1))
  if (!label || label.includes('.')) return null
  return label
}

/** label.ipstream.cl → label.casterfly.com (o null si no es un subdominio). */
function mapLegacyHost(hostname) {
  const label = platformLabel(hostname, OLD_BASE)
  return label ? `${label}.${NEW_BASE}` : null
}

/** Reescribe una URL de sitio que apunta exactamente al host viejo. */
function mapWebsiteUrl(url, oldHost, newHost) {
  if (!url) return null
  const normalized = String(url).trim().replace(/\/+$/, '')
  if (normalized === `https://${oldHost}` || normalized === `http://${oldHost}`) {
    return `https://${newHost}`
  }
  return null
}

function emptySummary() {
  return {
    appConfigUpdated: 0,
    domainsCreated: 0,
    domainsUpdated: 0,
    basicDataUpdated: 0,
    serversUpdated: 0,
    conflicts: [],
  }
}

/**
 * Ejecuta la migración contra un cliente Prisma-like.
 * @param {any} db
 * @param {{ apply?: boolean, log?: (message: string) => void }} options
 */
async function migrateCasterflyDomains(db, { apply = false, log = () => {} } = {}) {
  const summary = emptySummary()
  const write = apply ? 'aplicado' : 'dry-run'

  // 1. Configuración de plataforma
  const cfg = await db.appConfig.findFirst()
  const cfgNeeds =
    !cfg ||
    cfg.clientSitesDomain !== NEW_BASE ||
    cfg.clientSitesTarget !== NEW_TARGET

  if (cfgNeeds) {
    if (apply) {
      if (cfg) {
        await db.appConfig.update({
          where: { id: cfg.id },
          data: { clientSitesDomain: NEW_BASE, clientSitesTarget: NEW_TARGET },
        })
      } else {
        await db.appConfig.create({
          data: { clientSitesDomain: NEW_BASE, clientSitesTarget: NEW_TARGET },
        })
      }
    }
    summary.appConfigUpdated = 1
    log(`app_config → ${NEW_BASE} / ${NEW_TARGET} (${write})`)
  }

  // 2. Dominios de clientes
  const rows = await db.clientDomain.findMany({ where: { kind: 'subdomain' } })
  for (const row of rows) {
    const newHost = mapLegacyHost(row.hostname)
    if (!newHost) continue

    const existing = await db.clientDomain.findUnique({ where: { hostname: newHost } })
    if (existing && existing.clientId !== row.clientId) {
      summary.conflicts.push({
        old: row.hostname,
        new: newHost,
        existingClientId: existing.clientId,
      })
      log(`⚠ conflicto: ${newHost} ya pertenece a ${existing.clientId}; se omite ${row.hostname}`)
      continue
    }

    // Si el cliente ya tiene un dominio custom primario, el subdominio nuevo
    // se crea como alias (no primario) para no romper esa elección.
    const customPrimary = await db.clientDomain.findFirst({
      where: { clientId: row.clientId, kind: 'custom', isPrimary: true },
    })
    const makePrimary = !customPrimary

    if (!existing) {
      if (apply) {
        await db.clientDomain.create({
          data: {
            clientId: row.clientId,
            hostname: newHost,
            kind: 'subdomain',
            status: 'active',
            isPrimary: makePrimary,
          },
        })
      }
      summary.domainsCreated += 1
      log(`dominio + ${newHost} → cliente ${row.clientId} (${write})`)
    } else {
      const needsPrimary = makePrimary && !existing.isPrimary
      const needsActive = existing.status !== 'active'
      if (needsPrimary || needsActive) {
        if (apply) {
          await db.clientDomain.update({
            where: { id: existing.id },
            data: {
              ...(needsPrimary ? { isPrimary: true } : {}),
              ...(needsActive ? { status: 'active' } : {}),
            },
          })
        }
        summary.domainsUpdated += 1
        log(`dominio ~ ${newHost} (${write})`)
      }
    }

    // El host viejo queda activo como alias y nunca como primario.
    if (row.isPrimary || row.status !== 'active') {
      if (apply) {
        await db.clientDomain.update({
          where: { id: row.id },
          data: { isPrimary: false, status: 'active' },
        })
      }
      summary.domainsUpdated += 1
      log(`alias ~ ${row.hostname} (${write})`)
    }

    // 3. BasicData.websiteUrl
    const basic = await db.basicData.findUnique({ where: { clientId: row.clientId } })
    const newWebsiteUrl = basic
      ? mapWebsiteUrl(basic.websiteUrl, normalizeHost(row.hostname), newHost)
      : null
    if (newWebsiteUrl) {
      if (apply) {
        await db.basicData.update({
          where: { clientId: row.clientId },
          data: { websiteUrl: newWebsiteUrl },
        })
      }
      summary.basicDataUpdated += 1
      log(`websiteUrl ~ ${row.clientId} → ${newWebsiteUrl} (${write})`)
    }
  }

  // 4. Servidor principal de streaming (no toca nodos remotos)
  const servers = await db.streamingServer.findMany({
    where: {
      OR: [
        { publicHostname: OLD_STREAM_HOST },
        { publicHostname: OLD_PANEL_HOST },
        { publicUrl: { contains: OLD_STREAM_HOST } },
      ],
    },
  })
  for (const server of servers) {
    if (apply) {
      await db.streamingServer.update({
        where: { id: server.id },
        data: {
          publicHostname: NEW_STREAM_HOST,
          publicUrl: `https://${NEW_STREAM_HOST}`,
        },
      })
    }
    summary.serversUpdated += 1
    log(`streaming_server ~ ${server.id} → ${NEW_STREAM_HOST} (${write})`)
  }

  return summary
}

async function main() {
  const apply = process.argv.includes('--apply')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const summary = await migrateCasterflyDomains(prisma, {
      apply,
      log: (message) => console.log(message),
    })
    console.log('\nResumen:')
    console.log(`  app_config actualizados: ${summary.appConfigUpdated}`)
    console.log(`  dominios creados:        ${summary.domainsCreated}`)
    console.log(`  dominios actualizados:   ${summary.domainsUpdated}`)
    console.log(`  websiteUrl actualizadas: ${summary.basicDataUpdated}`)
    console.log(`  servidores actualizados: ${summary.serversUpdated}`)
    console.log(`  conflictos:              ${summary.conflicts.length}`)
    if (!apply) console.log('\nDry-run: no se escribió nada. Usá --apply para aplicar.')
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error en la migración:', error)
    process.exit(1)
  })
}

module.exports = {
  OLD_BASE,
  NEW_BASE,
  NEW_TARGET,
  OLD_PANEL_HOST,
  OLD_STREAM_HOST,
  NEW_STREAM_HOST,
  platformLabel,
  mapLegacyHost,
  mapWebsiteUrl,
  migrateCasterflyDomains,
}
