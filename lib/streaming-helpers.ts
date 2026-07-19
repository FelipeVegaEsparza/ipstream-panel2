// =====================================================
// createRadioStreamForClient — helper para crear RadioStream
// =====================================================
// Se usa al crear un Client (en registro público o desde admin).
// Genera icecastMount y passwords únicos, y los encripta.

import { prisma } from '@/lib/prisma'
import { encrypt } from './encryption'
import crypto from 'crypto'

/**
 * Crea un RadioStream para un Client.
 * @param clientId
 * @param bitrate (opcional, default 128)
 * @returns {RadioStream}
 */
export async function createRadioStreamForClient(clientId: string, bitrate = 128) {
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
  const sourcePassword = process.env.ICE_SOURCE_PASSWORD || 'hackme'

  // Audit log
  await prisma.streamingAuditLog.create({
    data: {
      clientId,
      action: 'config_update',
      payload: { event: 'live_password_revealed', requesterId } as any,
    },
  })

  return sourcePassword
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
