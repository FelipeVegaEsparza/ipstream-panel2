// =====================================================
// Live Console — biblioteca local
// =====================================================
// Chromium: handle de carpeta persistido en IndexedDB.
// Otros navegadores: archivos por sesión.
// Los audios nunca se suben al servidor.

import {
  isAudioFile,
  isCoverFile,
  mimeForName,
  parseTrackName,
  trackIdFor,
} from './audio-math'
import type { LocalTrack } from './types'

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
}

const DB_NAME = 'ipstream-live-console'
const DB_VERSION = 1
const STORE_HANDLES = 'handles'
const STORE_TRACKS = 'tracks'
const DIRECTORY_KEY = 'music-directory'

interface CachedTrack {
  id: string
  name: string
  path: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  size: number
  lastModified: number
  mimeType: string
  handle?: FileSystemFileHandle | null
  coverHandle?: FileSystemFileHandle | null
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_HANDLES)) db.createObjectStore(STORE_HANDLES)
      if (!db.objectStoreNames.contains(STORE_TRACKS)) db.createObjectStore(STORE_TRACKS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'))
  })
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDb()
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).get(key)
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker()) return null
  try {
    return await window.showDirectoryPicker!({ mode: 'read' })
  } catch {
    return null
  }
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await idbSet(STORE_HANDLES, DIRECTORY_KEY, handle)
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await idbGet<FileSystemDirectoryHandle>(STORE_HANDLES, DIRECTORY_KEY)
  } catch {
    return null
  }
}

export async function forgetDirectoryHandle(): Promise<void> {
  await idbDelete(STORE_HANDLES, DIRECTORY_KEY)
  await idbDelete(STORE_TRACKS, 'index')
}

export async function verifyDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const anyHandle = handle as unknown as {
    queryPermission?: (desc: { mode: 'read' }) => Promise<PermissionState>
    requestPermission?: (desc: { mode: 'read' }) => Promise<PermissionState>
  }
  if (anyHandle.queryPermission) {
    const state = await anyHandle.queryPermission({ mode: 'read' })
    if (state === 'granted') return true
  }
  if (anyHandle.requestPermission) {
    const state = await anyHandle.requestPermission({ mode: 'read' })
    return state === 'granted'
  }
  return true
}

export async function persistStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export function fileToTrack(file: File, path?: string): LocalTrack {
  const parsed = parseTrackName(file.name)
  const trackPath = path ?? file.webkitRelativePath ?? file.name
  return {
    id: trackIdFor(trackPath, file.size, file.lastModified),
    name: file.name,
    path: trackPath,
    title: parsed.title,
    artist: parsed.artist,
    album: null,
    duration: null,
    size: file.size,
    lastModified: file.lastModified,
    mimeType: file.type || mimeForName(file.name),
    source: 'file',
    file,
    handle: null,
    coverHandle: null,
    coverFile: null,
    available: true,
  }
}

function directoryOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(0, index) : ''
}

export function filesToTracks(files: FileList | File[]): LocalTrack[] {
  const all = Array.from(files)
  const covers = new Map<string, File>()
  for (const file of all) {
    if (!isCoverFile(file.name)) continue
    const dir = directoryOf(file.webkitRelativePath || file.name)
    if (!covers.has(dir)) covers.set(dir, file)
  }
  return all
    .filter((file) => isAudioFile(file.name, file.type))
    .map((file) => {
      const track = fileToTrack(file)
      return { ...track, coverFile: covers.get(directoryOf(track.path)) ?? null }
    })
}

export interface ScanProgress {
  scanned: number
  added: number
}

export interface ScanHandle {
  promise: Promise<LocalTrack[]>
  cancel: () => void
}

export function scanDirectory(
  handle: FileSystemDirectoryHandle,
  onProgress?: (progress: ScanProgress) => void
): ScanHandle {
  let worker: Worker | null = null
  let cancelled = false

  const promise = new Promise<LocalTrack[]>((resolve, reject) => {
    try {
      worker = new Worker(new URL('./library.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      worker = null
    }

    if (!worker) {
      void scanOnMainThread(handle, onProgress, () => cancelled)
        .then(resolve)
        .catch(reject)
      return
    }

    const tracks: LocalTrack[] = []
    let scanned = 0

    worker.onmessage = (event: MessageEvent<any>) => {
      const message = event.data
      if (message?.type === 'track' && message.track) {
        tracks.push(message.track as LocalTrack)
        onProgress?.({ scanned, added: tracks.length })
      } else if (message?.type === 'progress') {
        scanned = message.scanned ?? scanned
        onProgress?.({ scanned, added: tracks.length })
      } else if (message?.type === 'done') {
        onProgress?.({ scanned, added: tracks.length })
        resolve(tracks)
        worker?.terminate()
      } else if (message?.type === 'error') {
        reject(new Error(message.message || 'Error escaneando la carpeta'))
        worker?.terminate()
      }
    }
    worker.onerror = (event) => {
      reject(new Error(event.message || 'Error del worker de biblioteca'))
      worker?.terminate()
    }

    worker.postMessage({ type: 'scan', handle })
  })

  return {
    promise,
    cancel: () => {
      cancelled = true
      worker?.terminate()
    },
  }
}

async function scanOnMainThread(
  handle: FileSystemDirectoryHandle,
  onProgress?: (progress: ScanProgress) => void,
  isCancelled?: () => boolean
): Promise<LocalTrack[]> {
  const tracks: LocalTrack[] = []
  let scanned = 0

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string,
    inheritedCover: FileSystemFileHandle | null
  ): Promise<void> {
    const entries: Array<[string, FileSystemHandle]> = []
    for await (const entry of (dir as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>
    }).entries()) {
      entries.push(entry)
      if (isCancelled?.()) return
    }
    const ownCover = entries.find(
      ([name, entry]) => entry.kind === 'file' && isCoverFile(name)
    )?.[1] as FileSystemFileHandle | undefined
    const coverHandle = ownCover ?? inheritedCover

    for (const [name, entry] of entries) {
      if (isCancelled?.()) return
      if (entry.kind === 'directory') {
        await walk(entry as FileSystemDirectoryHandle, `${prefix}${name}/`, coverHandle)
        continue
      }
      const fileHandle = entry as FileSystemFileHandle
      if (!isAudioFile(name)) continue
      scanned++
      try {
        const file = await fileHandle.getFile()
        const parsed = parseTrackName(name)
        tracks.push({
          id: trackIdFor(`${prefix}${name}`, file.size, file.lastModified),
          name,
          path: `${prefix}${name}`,
          title: parsed.title,
          artist: parsed.artist,
          album: null,
          duration: null,
          size: file.size,
          lastModified: file.lastModified,
          mimeType: file.type || mimeForName(name),
          source: 'handle',
          handle: fileHandle,
          file: null,
          coverHandle,
          available: true,
        })
        onProgress?.({ scanned, added: tracks.length })
      } catch {
        // archivo ilegible: se omite
      }
    }
  }

  await walk(handle, '', null)
  return tracks
}

export async function getFileForTrack(track: LocalTrack): Promise<File> {
  if (track.file) return track.file
  if (track.handle) return track.handle.getFile()
  throw new Error('El archivo ya no está disponible')
}

export async function getDurationForTrack(track: LocalTrack): Promise<number | null> {
  try {
    const file = await getFileForTrack(track)
    const url = URL.createObjectURL(file)
    try {
      return await new Promise<number | null>((resolve) => {
        const audio = new Audio()
        audio.preload = 'metadata'
        const done = (value: number | null) => {
          audio.src = ''
          URL.revokeObjectURL(url)
          resolve(value)
        }
        audio.onloadedmetadata = () => {
          done(Number.isFinite(audio.duration) ? audio.duration : null)
        }
        audio.onerror = () => done(null)
        audio.src = url
      })
    } finally {
      // el revoke ocurre en done
    }
  } catch {
    return null
  }
}

/** Hidrata duraciones en segundo plano, de a una, para no bloquear la UI. */
export async function hydrateDurations(
  tracks: LocalTrack[],
  onUpdate: (track: LocalTrack, duration: number) => void,
  limit = 300
): Promise<void> {
  let count = 0
  for (const track of tracks) {
    if (count >= limit) break
    if (track.duration != null) continue
    count++
    const duration = await getDurationForTrack(track)
    if (duration != null) onUpdate(track, duration)
  }
}

export async function cacheLibrary(tracks: LocalTrack[]): Promise<void> {
  const serializable: CachedTrack[] = tracks.filter((track) => track.handle).map((track) => ({
    id: track.id,
    name: track.name,
    path: track.path,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    size: track.size,
    lastModified: track.lastModified,
    mimeType: track.mimeType,
    handle: track.handle ?? null,
    coverHandle: track.coverHandle ?? null,
  }))
  await idbSet(STORE_TRACKS, 'index', serializable)
}

export async function loadCachedLibrary(): Promise<LocalTrack[]> {
  try {
    const rows = await idbGet<CachedTrack[]>(STORE_TRACKS, 'index')
    if (!Array.isArray(rows)) return []
    return rows.map((row) => ({
      ...row,
      source: 'handle' as const,
      file: null,
      available: !!row.handle,
    }))
  } catch {
    return []
  }
}
