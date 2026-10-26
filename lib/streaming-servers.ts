// =====================================================
// Streaming servers — resolución de nodos multi-servidor
// =====================================================
// Cada cliente se asigna a un StreamingServer por servicio (radio/video).
// Estas funciones resuelven el target (baseUrl + token descifrado) que
// usa lib/streaming-client.ts para hablar con el agente correcto.

import { prisma, type PrismaDb } from '@/lib/prisma'
import { decrypt } from './encryption'

export interface StreamingServerTarget {
  id: string
  baseUrl: string
  token: string
  publicHostname: string
  publicUrl?: string | null
}

// Cache corto (TTL 15s) para no golpear la DB en cada llamada de streaming.
// Se invalida al migrar un cliente o al editar un servidor.
const serverCache = new Map<string, { target: StreamingServerTarget | null; at: number }>()
const CACHE_TTL_MS = 15000

function legacyEnvTarget(): StreamingServerTarget | null {
  const baseUrl = (process.env.STREAMING_AGENT_URL || 'http://agent:4000').replace(/\/+$/, '')
  const token = process.env.STREAMING_AGENT_TOKEN || ''
  if (!token) return null
  const publicHostname =
    process.env.ICE_PUBLIC_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
    process.env.ICE_HOSTNAME ||
    'localhost'
  return {
    id: '__env__',
    baseUrl,
    token,
    publicHostname,
    publicUrl: process.env.ICE_PUBLIC_URL || undefined,
  }
}

async function fetchServerTarget(id: string): Promise<StreamingServerTarget | null> {
  const cached = serverCache.get(id)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.target

  let target: StreamingServerTarget | null = null
  const s = await prisma.streamingServer.findUnique({ where: { id } })
  if (s && s.isActive) {
    try {
      const token = decrypt(s.tokenEnc)
      target = {
        id: s.id,
        baseUrl: s.baseUrl.replace(/\/+$/, ''),
        token,
        publicHostname: s.publicHostname,
        publicUrl: s.publicUrl,
      }
    } catch {
      target = null
    }
  }
  serverCache.set(id, { target, at: Date.now() })
  return target
}

/** Invalida la cache de resolución de servidores (tras migración/edición). */
export function invalidateServerCache(id?: string) {
  if (id) serverCache.delete(id)
  else serverCache.clear()
}

/** Target de un servidor por id (null si no existe o está inactivo). */
export function getServerTarget(id: string): Promise<StreamingServerTarget | null> {
  return fetchServerTarget(id)
}

/** Target por defecto: primer servidor activo; si no hay ninguno, env (legacy). */
export async function getDefaultServerTarget(): Promise<StreamingServerTarget | null> {
  const servers = await prisma.streamingServer.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  for (const s of servers) {
    const t = await fetchServerTarget(s.id)
    if (t) return t
  }
  return legacyEnvTarget()
}

/** Target del servidor de RADIO de un cliente (fallback: default). */
export async function resolveRadioServerTarget(clientId: string): Promise<StreamingServerTarget | null> {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  if (rs?.serverId) {
    const t = await fetchServerTarget(rs.serverId)
    if (t) return t
  }
  return getDefaultServerTarget()
}

/** Target del servidor de VIDEO de un cliente (fallback: default). */
export async function resolveVideoServerTarget(clientId: string): Promise<StreamingServerTarget | null> {
  const vs = await prisma.videoStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  if (vs?.serverId) {
    const t = await fetchServerTarget(vs.serverId)
    if (t) return t
  }
  return getDefaultServerTarget()
}

/** ID del primer servidor activo en DB (para asignar streams nuevos), o null. */
export async function getDefaultServerDbId(db: PrismaDb = prisma): Promise<string | null> {
  const s = await db.streamingServer.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return s?.id ?? null
}

export interface AgentProbe {
  online: boolean
  /** SHA corto que reporta el agente en /health (null si es viejo o no responde). */
  build: string | null
}

/**
 * Prueba /health del agente y extrae el SHA del código que corre.
 * No requiere token: /health está exento de auth en el agente.
 */
export async function probeServerTarget(
  target: StreamingServerTarget,
  timeoutMs = 5000
): Promise<AgentProbe> {
  try {
    const res = await fetch(`${target.baseUrl}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    let build: string | null = null
    try {
      const data = (await res.json()) as { build?: unknown }
      const raw = typeof data.build === 'string' ? data.build.trim() : ''
      build = raw && raw !== 'unknown' && raw !== 'dev' ? raw.slice(0, 7) : null
    } catch {
      build = null
    }
    return { online: res.ok, build }
  } catch {
    return { online: false, build: null }
  }
}

/** Health check HTTP de un target (sin token requerido en /health). */
export async function pingServerTarget(target: StreamingServerTarget, timeoutMs = 5000): Promise<boolean> {
  return (await probeServerTarget(target, timeoutMs)).online
}

/** SHA corto con el que se construyó la imagen del panel (null en dev). */
export function getPanelBuild(): string | null {
  const raw = (process.env.APP_GIT_SHA || '').trim()
  return raw ? raw.slice(0, 7) : null
}

export interface ServerHealthResult {
  server: {
    id: string
    name: string
    type: string
    baseUrl: string
    publicHostname: string
    isActive: boolean
    isHealthy: boolean
    lastHealthAt: Date | null
  }
  online: boolean
  radioClients: number
  videoClients: number
  accounts: number // clientes únicos con radio y/o TV en este servidor
  affectedClients: number
  /** SHA del código que corre el nodo (null si es viejo o no responde). */
  agentBuild: string | null
  /** SHA del panel, para comparar. */
  panelBuild: string | null
  /** true si el nodo reporta un build distinto al del panel. */
  buildOutdated: boolean
}

/**
 * Health check de todos los servidores registrados.
 * Actualiza isHealthy/lastHealthAt en DB y devuelve el estado con la
 * cantidad de clientes afectados por servidor (radio + video).
 * Es SOLO informativo: nunca modifica asignaciones.
 */
export async function checkAllServers(): Promise<ServerHealthResult[]> {
  const servers = await prisma.streamingServer.findMany({ orderBy: { createdAt: 'asc' } })
  const results: ServerHealthResult[] = []
  const panelBuild = getPanelBuild()

  for (const s of servers) {
    let online = false
    let agentBuild: string | null = null
    if (s.isActive) {
      const target = await fetchServerTarget(s.id)
      if (target) {
        const probe = await probeServerTarget(target)
        online = probe.online
        agentBuild = probe.build
      }
    }

    const server = await prisma.streamingServer.update({
      where: { id: s.id },
      data: s.isActive
        ? { isHealthy: online, lastHealthAt: online ? new Date() : s.lastHealthAt }
        : {},
    })

    const [radioClients, videoClients] = await Promise.all([
      prisma.radioStream.count({ where: { serverId: s.id } }),
      prisma.videoStream.count({ where: { serverId: s.id } }),
    ])

    // Cuentas únicas (clientes distintos) con radio y/o TV en este servidor
    const [radioAccountIds, videoAccountIds] = await Promise.all([
      prisma.radioStream.findMany({ where: { serverId: s.id }, select: { clientId: true } }),
      prisma.videoStream.findMany({ where: { serverId: s.id }, select: { clientId: true } }),
    ])
    const accountIds = new Set([
      ...radioAccountIds.map((r) => r.clientId),
      ...videoAccountIds.map((v) => v.clientId),
    ])

    results.push({
      server: {
        id: server.id,
        name: server.name,
        type: server.type,
        baseUrl: server.baseUrl,
        publicHostname: server.publicHostname,
        isActive: server.isActive,
        isHealthy: server.isHealthy,
        lastHealthAt: server.lastHealthAt,
      },
      online,
      radioClients,
      videoClients,
      accounts: accountIds.size,
      affectedClients: radioClients + videoClients,
      agentBuild,
      panelBuild,
      buildOutdated: Boolean(panelBuild && agentBuild && agentBuild !== panelBuild),
    })
  }

  return results
}

/** Pings un servidor por id (para validar destino de migración). */
export async function checkServerById(id: string): Promise<boolean> {
  const target = await fetchServerTarget(id)
  if (!target) return false
  const online = await pingServerTarget(target)
  await prisma.streamingServer.update({
    where: { id },
    data: { isHealthy: online, lastHealthAt: online ? new Date() : undefined },
  })
  return online
}
