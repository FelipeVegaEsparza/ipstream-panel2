// =====================================================
// Domain provisioner — job en background para dominios de cliente
// =====================================================
// Mismo patrón que lib/node-provisioner.ts: un mapa de jobs activos y progreso
// persistido en la fila del dominio (provisionStatus / provisionLog /
// provisionError). Subdominio: asegura el registro DNS. Custom: verifica CNAME.

import { prisma } from '@/lib/prisma'
import { ensureSubdomainRecord, verifyCustomDomain } from './dns-provider'

const MAX_LOG_LINES = 100
const activeJobs = new Map<string, Promise<void>>()

export function isDomainJobActive(domainId: string): boolean {
  return activeJobs.has(domainId)
}

async function setProgress(
  domainId: string,
  step: string | null,
  line: string,
  error: string | null = null
) {
  const row = await prisma.clientDomain.findUnique({
    where: { id: domainId },
    select: { provisionLog: true },
  })
  const log: string[] = Array.isArray(row?.provisionLog)
    ? (row!.provisionLog as unknown as string[])
    : []
  log.push(line)
  while (log.length > MAX_LOG_LINES) log.shift()

  await prisma.clientDomain.update({
    where: { id: domainId },
    data: {
      provisionLog: log as any,
      provisionStatus: error ? 'failed' : step ?? undefined,
      provisionError: error,
    },
  })
}

async function runProvisioning(domainId: string): Promise<void> {
  const domain = await prisma.clientDomain.findUnique({ where: { id: domainId } })
  if (!domain) return

  await prisma.clientDomain.update({
    where: { id: domainId },
    data: {
      provisionStatus: 'provisioning',
      provisionError: null,
      provisionLog: [] as any,
      provisionedAt: null,
    },
  })

  try {
    await setProgress(domainId, null, `▶ Provisionando ${domain.hostname} (${domain.kind})`)

    if (domain.kind === 'custom') {
      const ok = await verifyCustomDomain(domain.hostname)
      if (!ok) {
        await prisma.clientDomain.update({
          where: { id: domainId },
          data: {
            provisionStatus: 'pending_verification',
            provisionError: 'El dominio todavía no apunta a la plataforma (revisá el CNAME)',
          },
        })
        await setProgress(domainId, 'pending_verification', '✗ Verificación de DNS incompleta')
        return
      }
    } else {
      await ensureSubdomainRecord(domain.hostname)
    }

    await prisma.clientDomain.update({
      where: { id: domainId },
      data: {
        status: 'active',
        provisionStatus: 'done',
        provisionError: null,
        provisionedAt: new Date(),
      },
    })
    await setProgress(domainId, 'done', '✓ Dominio activo')
  } catch (err) {
    const msg = (err as Error).message
    await setProgress(domainId, null, `✗ ${msg}`, msg)
  }
}

/** Lanza (una vez) el job de provisión/verificación de un dominio. */
export function startDomainProvisioning(domainId: string): void {
  if (activeJobs.has(domainId)) return
  const job = runProvisioning(domainId).finally(() => activeJobs.delete(domainId))
  activeJobs.set(domainId, job)
}

/** Solo verifica (sin crear DNS). Para reintentar un dominio custom. */
export function startDomainVerification(domainId: string): void {
  startDomainProvisioning(domainId)
}
