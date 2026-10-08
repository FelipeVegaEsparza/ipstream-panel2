import { useEffect, useState } from 'react'
import type { StreamingTrack } from '@/core/types'

export interface HistoryTrack {
  key: string
  title: string
  artist: string
  coverUrl: string | null
  at: number
}

/** Máximo de canciones conservadas en el historial. */
export const MAX_HISTORY = 20

function storageKey(clientId: string): string {
  return `ipstream_song_history_${clientId}`
}

/** Clave de deduplicación: portada si existe, si no título + artista. */
export function trackKey(
  track: Pick<StreamingTrack, 'title' | 'artist' | 'coverUrl'>
): string {
  return track.coverUrl ?? `${track.title}|${track.artist}`
}

function readHistory(clientId: string | null | undefined): HistoryTrack[] {
  if (!clientId || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(clientId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is HistoryTrack =>
          Boolean(item) &&
          typeof (item as HistoryTrack).key === 'string' &&
          typeof (item as HistoryTrack).title === 'string'
      )
      .slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

function writeHistory(clientId: string, tracks: HistoryTrack[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey(clientId), JSON.stringify(tracks))
  } catch {
    // almacenamiento no disponible o lleno: el historial queda solo en memoria
  }
}

/**
 * Historial de canciones construido en el cliente: agrega cada tema nuevo que
 * reporta el streaming (más reciente primero), evita duplicados y persiste en
 * localStorage. La API pública no expone un endpoint de historial.
 */
export function useSongHistory(
  clientId: string | null | undefined,
  currentTrack: StreamingTrack | null | undefined
): HistoryTrack[] {
  const [history, setHistory] = useState<HistoryTrack[]>(() => readHistory(clientId))

  useEffect(() => {
    setHistory(readHistory(clientId))
  }, [clientId])

  const key = currentTrack ? trackKey(currentTrack) : null

  useEffect(() => {
    if (!clientId || !currentTrack || !key) return

    setHistory((prev) => {
      if (prev[0]?.key === key) return prev

      const entry: HistoryTrack = {
        key,
        title: currentTrack.title,
        artist: currentTrack.artist,
        coverUrl: currentTrack.coverUrl,
        at: Date.now()
      }
      const next = [entry, ...prev.filter((track) => track.key !== key)].slice(
        0,
        MAX_HISTORY
      )
      writeHistory(clientId, next)
      return next
    })
  }, [clientId, key, currentTrack])

  return history
}
