// =====================================================
// Migración manual de clientes entre servidores de streaming
// =====================================================
// Orquestada por el panel. Copia los archivos de biblioteca del servidor
// origen al destino (vía el panel), hace swap de serverId, arranca en el
// destino, detiene el origen y limpia. SIEMPRE es iniciada por el admin.
// En caso de fallo deja el cliente en un estado consistente.

import { prisma } from '@/lib/prisma'
import { getServerTarget, checkServerById } from '@/lib/streaming-servers'
import { rewriteClientPublicUrls } from '@/lib/streaming-helpers'
import { streamingClient, videoClient } from '@/lib/streaming-client'

interface MigrateFile {
  kind: 'radio-mp3' | 'radio-jingle' | 'radio-cover' | 'video-file' | 'video-thumbnail'
  name: string
  sourcePath: string // path absoluto en el agente origen para leer el archivo
}

export type MigrationService = 'radio' | 'video'

export class MigrationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
    this.name = 'MigrationError'
  }
}

async function readFileAsBlob(baseUrl: string, token: string, path: string): Promise<Blob> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) {
    throw new MigrationError(`No se pudo leer el archivo origen (${res.status}): ${path}`, 502)
  }
  return res.blob()
}

async function importFile(baseUrl: string, token: string, clientId: string, file: MigrateFile, blob: Blob) {
  const form = new FormData()
  form.append('kind', file.kind)
  form.append('name', file.name)
  form.append('file', blob, file.name)
  const res = await fetch(`${baseUrl}/api/migrate/${encodeURIComponent(clientId)}/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new MigrationError(`Fallo la copia de ${file.name} al destino (${res.status}): ${text}`, 502)
  }
}

async function verifyTargetFiles(baseUrl: string, token: string, clientId: string, expected: MigrateFile[]) {
  const res = await fetch(`${baseUrl}/api/migrate/${encodeURIComponent(clientId)}/files`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new MigrationError('No se pudo verificar los archivos en el destino', 502)
  const data = await res.json()

  for (const f of expected) {
    let present = false
    if (f.kind === 'radio-mp3') present = (data.radioMp3 || []).includes(f.name)
    else if (f.kind === 'radio-jingle') present = (data.radioJingles || []).includes(f.name)
    else if (f.kind === 'radio-cover') present = (data.radioCovers || []).includes(f.name)
    else if (f.kind === 'video-file') present = (data.videoFiles || []).includes(f.name.split('/').pop())
    else if (f.kind === 'video-thumbnail') present = (data.videoThumbs || []).includes(f.name)
    if (!present) {
      throw new MigrationError(`Verificación fallida: falta ${f.name} en el destino`, 502)
    }
  }
}

async function cleanupFiles(baseUrl: string, token: string, clientId: string, files: MigrateFile[]) {
  try {
    await fetch(`${baseUrl}/api/migrate/${encodeURIComponent(clientId)}/cleanup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: files.map((f) => ({ kind: f.kind, name: f.name })),
      }),
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    // best-effort
  }
}

async function stopOnServer(baseUrl: string, token: string, clientId: string, service: MigrationService) {
  const path = service === 'radio'
    ? `/api/streams/${encodeURIComponent(clientId)}/stop`
    : `/api/video/${encodeURIComponent(clientId)}/stop`
  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    })
  } catch {
    // best-effort
  }
}

export async function runClientMigration(
  clientId: string,
  services: MigrationService[],
  targetServerId: string,
  adminId: string
): Promise<{ services: MigrationService[]; copied: number }> {
  if (services.length === 0) throw new MigrationError('No se indicaron servicios a migrar')

  const target = await getServerTarget(targetServerId)
  if (!target) throw new MigrationError('El servidor destino no existe o está inactivo', 404)

  const targetHealthy = await checkServerById(targetServerId)
  if (!targetHealthy) throw new MigrationError('El servidor destino no responde', 502)

  const results: MigrationService[] = []
  let copiedTotal = 0

  for (const service of services) {
    const copied = await migrateService(clientId, service, target, adminId)
    copiedTotal += copied
    results.push(service)
  }

  return { services: results, copied: copiedTotal }
}

async function migrateService(
  clientId: string,
  service: MigrationService,
  target: { id: string; baseUrl: string; token: string; publicHostname: string },
  adminId: string
): Promise<number> {
  // Resolver origen
  const source = service === 'radio'
    ? await prisma.radioStream.findUnique({ where: { clientId }, select: { serverId: true } })
    : await prisma.videoStream.findUnique({ where: { clientId }, select: { serverId: true } })

  if (!source) throw new MigrationError(`El cliente no tiene stream de ${service}`)
  if (!source.serverId) throw new MigrationError(`El cliente no tiene servidor asignado para ${service}`)
  if (source.serverId === target.id) throw new MigrationError(`El cliente ya está en el servidor destino (${service})`)

  const sourceTarget = await getServerTarget(source.serverId)
  if (!sourceTarget) throw new MigrationError('El servidor origen no está disponible', 404)

  // Origen debe ser alcanzable para copiar archivos
  const sourceHealthy = await checkServerById(source.serverId)
  if (!sourceHealthy) {
    throw new MigrationError(
      'El servidor origen no responde: no se pueden copiar sus archivos. No se puede migrar sin acceso al origen.',
      502
    )
  }

  // 1. Listar archivos a copiar
  const files = await collectFiles(clientId, service)
  if (files.length === 0) {
    // No hay archivos que copiar; aun así se puede mover la asignación
    loggerAudit(clientId, service, 'migrate_no_files', adminId, target.id)
  }

  // 2. Copiar archivos origen -> destino (vía panel)
  let copied = 0
  try {
    for (const f of files) {
      const blob = await readFileAsBlob(sourceTarget.baseUrl, sourceTarget.token, f.sourcePath)
      await importFile(target.baseUrl, target.token, clientId, f, blob)
      copied++
    }

    // 3. Verificar
    await verifyTargetFiles(target.baseUrl, target.token, clientId, files)
  } catch (err) {
    // Rollback: limpiar lo copiado en destino (el origen quedó intacto)
    await cleanupFiles(target.baseUrl, target.token, clientId, files)
    if (err instanceof MigrationError) throw err
    throw new MigrationError(`Migración interrumpida: ${(err as Error).message}`, 502)
  }

  // 4. Swap de serverId + reescritura de URLs
  const swapped = await swapServerId(clientId, service, target.id)
  if (!swapped) {
    await cleanupFiles(target.baseUrl, target.token, clientId, files)
    throw new MigrationError('No se pudo actualizar la asignación del cliente', 500)
  }
  await rewriteClientPublicUrls(
    clientId,
    service === 'radio' ? { radioServerId: target.id } : { videoServerId: target.id }
  )

  // 5. Arrancar en destino
  try {
    if (service === 'radio') await streamingClient.start(clientId)
    else await videoClient.start(clientId)
  } catch (err) {
    // Rollback post-swap: revertir asignación y limpiar destino
    await swapServerId(clientId, service, source.serverId)
    await rewriteClientPublicUrls(
      clientId,
      service === 'radio' ? { radioServerId: source.serverId } : { videoServerId: source.serverId }
    )
    await cleanupFiles(target.baseUrl, target.token, clientId, files)
    throw new MigrationError(`La migración falló al arrancar en el destino; se revirtió: ${(err as Error).message}`, 502)
  }

  // 6. Detener origen (best-effort) y limpiar sus archivos
  await stopOnServer(sourceTarget.baseUrl, sourceTarget.token, clientId, service)
  await cleanupFiles(sourceTarget.baseUrl, sourceTarget.token, clientId, files)

  loggerAudit(clientId, service, 'migrated', adminId, target.id, copied)

  return copied
}

async function collectFiles(clientId: string, service: MigrationService): Promise<MigrateFile[]> {
  const files: MigrateFile[] = []

  if (service === 'radio') {
    const tracks = await prisma.track.findMany({
      where: { clientId },
      select: { id: true, fileName: true, coverUrl: true },
    })
    for (const t of tracks) {
      files.push({ kind: 'radio-mp3', name: t.fileName, sourcePath: `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(t.id)}/audio` })
      if (t.coverUrl) {
        files.push({ kind: 'radio-cover', name: `${t.id}.jpg`, sourcePath: `/api/streams/${encodeURIComponent(clientId)}/library/${encodeURIComponent(t.id)}/cover` })
      }
    }

    const jingles = await prisma.jingle.findMany({
      where: { clientId },
      select: { id: true, fileName: true, coverUrl: true },
    })
    for (const j of jingles) {
      files.push({ kind: 'radio-jingle', name: j.fileName, sourcePath: `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(j.id)}/audio` })
      if (j.coverUrl) {
        files.push({ kind: 'radio-cover', name: `${j.id}.jpg`, sourcePath: `/api/streams/${encodeURIComponent(clientId)}/jingles/${encodeURIComponent(j.id)}/cover` })
      }
    }
  } else {
    const tracks = await prisma.videoTrack.findMany({
      where: { clientId },
      select: { id: true, filepath: true, thumbnail: true },
    })
    for (const t of tracks) {
      files.push({
        kind: 'video-file',
        name: t.filepath,
        sourcePath: `/api/migrate/${encodeURIComponent(clientId)}/video-track/${encodeURIComponent(t.id)}/raw`,
      })
      if (t.thumbnail) {
        const thumbName = t.thumbnail.split('/').pop() || `${t.id}.jpg`
        files.push({
          kind: 'video-thumbnail',
          name: thumbName,
          sourcePath: `/api/video/${encodeURIComponent(clientId)}/thumbnails/${encodeURIComponent(thumbName)}`,
        })
      }
    }
  }

  return files
}

async function swapServerId(clientId: string, service: MigrationService, serverId: string): Promise<boolean> {
  try {
    if (service === 'radio') {
      await prisma.radioStream.update({ where: { clientId }, data: { serverId } })
    } else {
      await prisma.videoStream.update({ where: { clientId }, data: { serverId } })
    }
    return true
  } catch {
    return false
  }
}

function loggerAudit(clientId: string, service: MigrationService, action: string, adminId: string, targetServerId: string, copied = 0) {
  prisma.streamingAuditLog.create({
    data: {
      clientId,
      action: action === 'migrated' ? 'config_update' : 'error',
      payload: {
        event: `client_migration_${action}`,
        service,
        targetServerId,
        copied,
        adminId,
      } as any,
    },
  }).catch(() => {})
}
