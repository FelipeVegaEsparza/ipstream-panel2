// =====================================================
// Streaming seed — contenido por defecto para el AutoDJ
// =====================================================
// Al crear un cliente con RadioStream, se siembra un tema MP3
// (asset del repo) + una playlist activa "Playlist por defecto",
// para que el AutoDJ tenga siempre algo que reproducir.
// Pasa por los endpoints del streaming-agent (upload + playlists)
// y NUNCA lanza: un fallo aquí no rompe la creación del cliente.

import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { streamingClient } from './streaming-client'

const DEFAULT_JINGLE_PATH = join(process.cwd(), 'public', 'audio', 'default-jingle.mp3')
const DEFAULT_PLAYLIST_NAME = 'Playlist por defecto'

/**
 * Siembra el contenido por defecto de un cliente con RadioStream.
 * Omite si el cliente ya tiene tracks o una playlist activa (no duplica).
 * Aislado: cualquier error se registra y se devuelve { ok: false }.
 */
export async function seedDefaultAutoDjContent(clientId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const hasRadioStream = await prisma.radioStream.findUnique({
      where: { clientId },
      select: { id: true },
    })
    if (!hasRadioStream) {
      return { ok: false, error: 'El cliente no tiene RadioStream' }
    }

    // No duplicar: si ya tiene contenido, se omite.
    const [hasTracks, hasActivePlaylist] = await Promise.all([
      prisma.track.findFirst({ where: { clientId }, select: { id: true } }),
      prisma.playlist.findFirst({ where: { clientId, isActive: true }, select: { id: true } }),
    ])
    if (hasTracks || hasActivePlaylist) {
      return { ok: false, error: 'El cliente ya tiene contenido' }
    }

    // Leer el MP3 del asset y subirlo al agente (crea el Track).
    const buffer = await readFile(DEFAULT_JINGLE_PATH)
    const file = new File([buffer], 'default-jingle.mp3', { type: 'audio/mpeg' })
    const uploaded = await streamingClient.uploadTrack(clientId, file)
    const trackId = uploaded?.track?.id
    if (!trackId) {
      return { ok: false, error: 'No se pudo subir el tema por defecto' }
    }

    // Crear la playlist y agregar el track.
    const playlist = await streamingClient.createPlaylist(clientId, {
      name: DEFAULT_PLAYLIST_NAME,
      description: 'Contenido por defecto creado al contratar el plan.',
    })
    const playlistId = playlist?.playlistId
    if (!playlistId) {
      return { ok: false, error: 'No se pudo crear la playlist por defecto' }
    }

    await streamingClient.addTrackToPlaylist(clientId, playlistId, trackId)

    // Activar la playlist (regenera el .m3u del AutoDJ).
    await streamingClient.activatePlaylist(clientId, playlistId)

    return { ok: true }
  } catch (err) {
    console.error('[streaming-seed] seedDefaultAutoDjContent:', err)
    return { ok: false, error: (err as Error).message }
  }
}
