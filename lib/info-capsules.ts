import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { streamingClient } from '@/lib/streaming-client'

export interface AddCapsuleResult {
  ok: true
  playlistId: string
  trackId: string
  title: string
}

/**
 * Copia la cápsula a la biblioteca del cliente y la agrega a una playlist.
 * La copia es un Track normal marcado con capsuleId para mostrarla como cápsula
 * sin duplicar toda la lógica de playlist/M3U del agente.
 */
export async function addCapsuleToPlaylist(params: {
  clientId: string
  capsuleId: string
  playlistId: string
}): Promise<AddCapsuleResult> {
  const capsule = await prisma.infoCapsule.findFirst({
    where: { id: params.capsuleId, active: true },
    include: { category: { select: { name: true } } },
  })
  if (!capsule) throw new Error('capsule_not_found')

  const ext = path.extname(capsule.fileName || capsule.url).toLowerCase()
  if (ext !== '.mp3' && capsule.mimeType !== 'audio/mpeg') {
    throw new Error('capsule_must_be_mp3')
  }

  let track = await prisma.track.findFirst({
    where: { clientId: params.clientId, capsuleId: capsule.id },
    select: { id: true },
  })

  if (!track) {
    const sourcePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      'info-capsules',
      path.basename(capsule.url)
    )
    const buffer = await fs.readFile(sourcePath)
    const file = new File([buffer], capsule.fileName || `capsula-${capsule.id}.mp3`, {
      type: capsule.mimeType || 'audio/mpeg',
    })
    const uploaded = await streamingClient.uploadTrack(params.clientId, file)
    const trackId = uploaded?.track?.id
    if (!trackId) throw new Error('capsule_copy_failed')
    await streamingClient.updateTrack(params.clientId, trackId, {
      title: capsule.title,
      artist: capsule.category?.name ? `Cápsula · ${capsule.category.name}` : 'Cápsula',
      capsuleId: capsule.id,
    })
    track = { id: trackId }
  }

  const added = await streamingClient.addTrackToPlaylist(params.clientId, params.playlistId, track.id)
  return {
    ok: true,
    playlistId: params.playlistId,
    trackId: track.id,
    title: capsule.title,
    ...added,
  } as AddCapsuleResult
}
