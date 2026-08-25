// =====================================================
// createRadioStreamForClient — helper para crear RadioStream
// =====================================================
// Se usa al crear un Client (en registro público o desde admin).
// Genera icecastMount y passwords únicos, y los encripta.

import { prisma } from '@/lib/prisma'
import { encrypt } from './encryption'
import { getDefaultServerDbId } from './streaming-servers'
import crypto from 'crypto'

/**
 * Crea un RadioStream para un Client.
 * @param clientId
 * @param bitrate (opcional, default 128)
 * @param serverId (opcional, default: primer servidor activo)
 * @returns {RadioStream}
 */
export async function createRadioStreamForClient(clientId: string, bitrate = 128, serverId?: string) {
  // Asignar servidor por defecto si no se indica
  const assignedServerId = serverId ?? (await getDefaultServerDbId())

  // Generar identificadores únicos
  // icecastMount: nombre corto basado en hash del clientId
  const mountSuffix = crypto.createHash('sha256')
    .update(clientId)
    .digest('hex')
    .slice(0, 12)
  const icecastMount = `radio_${mountSuffix}`

  // Buscar un puerto telnet libre (rango 12340-65535)
  const existingPorts = await prisma.radioStream.findMany({
    select: { liquidsoapTelnetPort: true },
  })
  const usedPorts = new Set(existingPorts.map((r) => r.liquidsoapTelnetPort))
  let telnetPort = 12340
  while (usedPorts.has(telnetPort) && telnetPort < 65535) {
    telnetPort++
  }
  if (usedPorts.has(telnetPort)) {
    throw new Error('No hay puertos telnet disponibles')
  }

  // Generar passwords seguros
  const sourcePassword = crypto.randomBytes(12).toString('hex')
  const livePassword = crypto.randomBytes(12).toString('hex')

  // Encriptar passwords
  const sourcePasswordEnc = encrypt(sourcePassword)
  const livePasswordEnc = encrypt(livePassword)

  // Crear en DB
  const radioStream = await prisma.radioStream.create({
    data: {
      clientId,
      serverId: assignedServerId,
      icecastMount,
      liquidsoapTelnetPort: telnetPort,
      sourcePasswordEnc,
      livePasswordEnc,
      bitrate,
      status: 'off',
    },
  })

  return { radioStream, sourcePassword, livePassword, icecastMount, telnetPort }
}

/**
 * Desencripta el livePassword de un cliente (para mostrar al cliente en su dashboard).
 * Audita el acceso.
 */
export async function revealLivePassword(clientId: string, requesterId: string) {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { livePasswordEnc: true },
  })
  if (!rs) throw new Error('RadioStream no encontrado')

  const { decrypt } = await import('./encryption')
  const livePassword = decrypt(rs.livePasswordEnc)

  // Audit log
  await prisma.streamingAuditLog.create({
    data: {
      clientId,
      action: 'config_update',
      payload: { event: 'live_password_revealed', requesterId } as any,
    },
  })

  return livePassword
}

/**
 * Desencripta el sourcePassword de un cliente (solo admin).
 */
export async function revealSourcePassword(clientId: string, requesterId: string) {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { sourcePasswordEnc: true },
  })
  if (!rs) throw new Error('RadioStream no encontrado')

  const { decrypt } = await import('./encryption')
  const sourcePassword = decrypt(rs.sourcePasswordEnc)

  await prisma.streamingAuditLog.create({
    data: {
      clientId,
      action: 'config_update',
      payload: { event: 'source_password_revealed', requesterId } as any,
    },
  })

  return sourcePassword
}

// =====================================================
// createVideoStreamForClient — helper para crear VideoStream
// =====================================================

export async function createVideoStreamForClient(clientId: string, serverId?: string) {
  const assignedServerId = serverId ?? (await getDefaultServerDbId())
  const videoStream = await prisma.videoStream.create({
    data: {
      clientId,
      serverId: assignedServerId,
      status: 'off',
      mode: 'playlist',
      shuffle: false,
      repeat: true,
      autoStart: true,
    },
  })

  return { videoStream }
}

/**
 * Retorna el stream key de Televisión para el DJ (OBS).
 * Usa un hash del clientId como stream key.
 */
export function getVideoStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

/**
 * Retorna la RTMP URL para que OBS se conecte (app 'dj': no compite con el AutoDJ en 'live').
 */
export function getVideoRtmpUrl(baseHost: string, clientId: string): string {
  const key = getVideoStreamKey(clientId)
  return `rtmp://${baseHost}:1935/dj/${key}`
}

/**
 * Retorna la URL HLS del stream.
 */
export function getVideoHlsUrl(baseHost: string, clientId: string): string {
  const key = getVideoStreamKey(clientId)
  return `http://${baseHost}:8080/live/${key}.m3u8`
}

/**
 * Base URL pública de la radio de un cliente, derivada del servidor asignado.
 * Prioriza `publicUrl` del servidor (ej: https://stream.midominio.cl vía Caddy).
 * Fallback: http://<publicHostname>:8000 (icecast directo) y luego env (legacy).
 */
export async function getRadioPublicBaseUrl(clientId: string): Promise<string> {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  if (rs?.serverId) {
    const { getServerTarget } = await import('./streaming-servers')
    const target = await getServerTarget(rs.serverId)
    if (target?.publicUrl) return target.publicUrl.replace(/\/+$/, '')
    if (target) return `http://${target.publicHostname}:8000`
  }
  const { getDefaultServerTarget } = await import('./streaming-servers')
  const def = await getDefaultServerTarget()
  if (def?.publicUrl) return def.publicUrl.replace(/\/+$/, '')
  if (def && def.id !== '__env__') return `http://${def.publicHostname}:8000`
  return process.env.ICE_PUBLIC_URL || 'http://localhost:8000'
}

/**
 * Hostname público de la radio de un cliente (para DJs y player).
 * Fallback a env (legacy).
 */
export async function getRadioPublicHost(clientId: string): Promise<string> {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  if (rs?.serverId) {
    const { getServerTarget } = await import('./streaming-servers')
    const target = await getServerTarget(rs.serverId)
    if (target) return target.publicHostname
  }
  const { getDefaultServerTarget } = await import('./streaming-servers')
  const def = await getDefaultServerTarget()
  if (def && def.id !== '__env__') return def.publicHostname
  return (
    process.env.ICE_PUBLIC_HOSTNAME ||
    process.env.ICE_PUBLIC_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
    process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
    'localhost'
  )
}

/**
 * Hostname público del servidor de VIDEO de un cliente (para RTMP/OBS).
 * Fallback a env (legacy).
 */
export async function getVideoPublicHost(clientId: string): Promise<string> {
  const vs = await prisma.videoStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  if (vs?.serverId) {
    const { getServerTarget } = await import('./streaming-servers')
    const target = await getServerTarget(vs.serverId)
    if (target) return target.publicHostname
  }
  const { getDefaultServerTarget } = await import('./streaming-servers')
  const def = await getDefaultServerTarget()
  if (def && def.id !== '__env__') return def.publicHostname
  return (
    process.env.RTMP_RELAY_PUBLIC_HOST ||
    process.env.HARBOR_PUBLIC_HOSTNAME ||
    process.env.NEXT_PUBLIC_STREAM_PUBLIC_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
    'localhost'
  )
}

/**
 * Base URL pública para HLS de un cliente (TV), derivada del servidor asignado.
 * - Servidor principal (el panel): HLS sale por el rewrite /live/* del panel con TLS
 *   → usa el origin del panel (NEXTAUTH_URL), ej: https://panelipstream.cl
 * - Nodo: si tiene publicUrl (TLS/nginx propio), se usa; si no, http://<host>:8080 (SRS directo).
 */
export async function getVideoPublicBase(clientId: string): Promise<string> {
  const vs = await prisma.videoStream.findUnique({
    where: { clientId },
    select: { serverId: true },
  })
  const { getServerTarget } = await import('./streaming-servers')
  let target = vs?.serverId ? await getServerTarget(vs.serverId) : null
  if (!target) {
    const { getDefaultServerTarget } = await import('./streaming-servers')
    target = await getDefaultServerTarget()
  }

  const mainAgentUrl = (process.env.STREAMING_AGENT_URL || 'http://agent:4000').replace(/\/+$/, '')
  if (target && target.baseUrl === mainAgentUrl) {
    // Servidor principal: el panel proxea /live/* a su SRS con TLS (Caddy).
    try {
      return new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin
    } catch {
      return ''
    }
  }
  if (target?.publicUrl) return target.publicUrl.replace(/\/+$/, '')
  if (target) return `http://${target.publicHostname}:8080`
  return process.env.NEXT_PUBLIC_STREAM_PUBLIC_URL || ''
}

/**
 * Reescribe BasicData.radioStreamingUrl / videoStreamingUrl según el
 * servidor asignado de cada servicio. Se usa al asignar/migrar un cliente.
 */
export async function rewriteClientPublicUrls(
  clientId: string,
  opts: { radioServerId?: string | null; videoServerId?: string | null }
) {
  const radioStream = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { icecastMount: true },
  })
  void opts

  // Radio: base pública del servidor de radio asignado
  const radioBase = await getRadioPublicBaseUrl(clientId)
  let radioStreamingUrl: string | null = radioStream && radioBase
    ? `${radioBase.replace(/\/+$/, '')}/${radioStream.icecastMount}`
    : null
  if (radioStreamingUrl === null && radioStream) {
    radioStreamingUrl = `${process.env.ICE_PUBLIC_URL || 'http://localhost:8000'}/${radioStream.icecastMount}`
  }

  // Video: base pública del servidor de video asignado (HLS por /live/*)
  const videoBase = await getVideoPublicBase(clientId)
  let videoStreamingUrl: string | null = videoBase
    ? `${videoBase.replace(/\/+$/, '')}/live/${getVideoStreamKey(clientId)}.m3u8`
    : null
  if (videoStreamingUrl === null) {
    const host = process.env.RTMP_RELAY_PUBLIC_HOST || process.env.HARBOR_PUBLIC_HOSTNAME || 'localhost'
    videoStreamingUrl = getVideoHlsUrl(host, clientId)
  }

  const clientName = (
    await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })
  )?.name || 'Cliente'

  await prisma.basicData.upsert({
    where: { clientId },
    create: { clientId, projectName: clientName, projectDescription: '', radioStreamingUrl, videoStreamingUrl },
    update: { radioStreamingUrl, videoStreamingUrl },
  })

  return { radioStreamingUrl, videoStreamingUrl }
}

// =====================================================
// Video Storage usage
// =====================================================

export async function getVideoStorageUsage(clientId: string): Promise<StorageUsage> {
  const [trackAgg, playlistCount] = await Promise.all([
    prisma.videoTrack.aggregate({
      where: { clientId },
      _sum: { filesize: true },
      _count: true,
    }),
    prisma.videoPlaylist.count({ where: { clientId } }),
  ])

  const vs = await prisma.videoStream.findUnique({
    where: { clientId },
    select: { storageQuotaMB: true },
  })

  const totalBytes = Number(trackAgg._sum.filesize ?? 0)
  const totalMB = totalBytes / (1024 * 1024)
  const totalGB = totalMB / 1024
  const quotaMB = vs?.storageQuotaMB ?? null
  const quotaBytes = quotaMB !== null ? quotaMB * 1024 * 1024 : null

  let percentUsed: number | null = null
  let remainingMB: number | null = null
  let exceeded = false
  if (quotaBytes !== null && quotaBytes > 0) {
    percentUsed = Math.min(100, (totalBytes / quotaBytes) * 100)
    remainingMB = Math.max(0, quotaMB! - totalMB)
    exceeded = totalBytes > quotaBytes
  }

  return {
    totalBytes,
    totalMB: Math.round(totalMB * 100) / 100,
    totalGB: Math.round(totalGB * 1000) / 1000,
    trackCount: trackAgg._count,
    playlistCount,
    quotaMB,
    quotaBytes,
    percentUsed: percentUsed !== null ? Math.round(percentUsed * 10) / 10 : null,
    remainingMB: remainingMB !== null ? Math.round(remainingMB * 100) / 100 : null,
    exceeded,
  }
}

// =====================================================
// Storage usage
// =====================================================

export interface StorageUsage {
  totalBytes: number
  totalMB: number
  totalGB: number
  trackCount: number
  playlistCount: number
  quotaMB: number | null
  quotaBytes: number | null
  percentUsed: number | null  // 0-100, null si no hay quota
  remainingMB: number | null
  exceeded: boolean
}

/**
 * Calcula el uso de storage actual de un cliente.
 * Suma el fileSize de todos sus tracks.
 */
export async function getStorageUsage(clientId: string): Promise<StorageUsage> {
  const [trackAgg, playlistCount] = await Promise.all([
    prisma.track.aggregate({
      where: { clientId },
      _sum: { fileSize: true },
      _count: true,
    }),
    prisma.playlist.count({ where: { clientId } }),
  ])

  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { storageQuotaMB: true },
  })

  const totalBytes = trackAgg._sum.fileSize ?? 0
  const totalMB = totalBytes / (1024 * 1024)
  const totalGB = totalMB / 1024
  const quotaMB = rs?.storageQuotaMB ?? null
  const quotaBytes = quotaMB !== null ? quotaMB * 1024 * 1024 : null

  let percentUsed: number | null = null
  let remainingMB: number | null = null
  let exceeded = false
  if (quotaBytes !== null && quotaBytes > 0) {
    percentUsed = Math.min(100, (totalBytes / quotaBytes) * 100)
    remainingMB = Math.max(0, quotaMB! - totalMB)
    exceeded = totalBytes > quotaBytes
  }

  return {
    totalBytes,
    totalMB: Math.round(totalMB * 100) / 100,
    totalGB: Math.round(totalGB * 1000) / 1000,
    trackCount: trackAgg._count,
    playlistCount,
    quotaMB,
    quotaBytes,
    percentUsed: percentUsed !== null ? Math.round(percentUsed * 10) / 10 : null,
    remainingMB: remainingMB !== null ? Math.round(remainingMB * 100) / 100 : null,
    exceeded,
  }
}

/**
 * Verifica si subir un archivo de `fileSize` bytes excede la cuota del cliente.
 * Retorna null si está OK, o un mensaje de error si excede.
 */
export async function checkStorageQuota(clientId: string, fileSize: number): Promise<string | null> {
  const usage = await getStorageUsage(clientId)
  if (usage.quotaBytes === null) return null
  const projected = usage.totalBytes + fileSize
  if (projected > usage.quotaBytes) {
    return `Subir este archivo excedería la cuota del cliente. ` +
      `Usado: ${usage.totalMB} MB, cuota: ${usage.quotaMB} MB, ` +
      `intento: ${(projected / 1024 / 1024).toFixed(2)} MB.`
  }
  return null
}
