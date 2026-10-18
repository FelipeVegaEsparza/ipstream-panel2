// =====================================================
// Live Console — botonera de efectos de sonido
// =====================================================
// Los efectos se guardan como Blob en IndexedDB para que persistan
// aunque se cierre el navegador. No se suben al servidor.

import { isAudioFile, mimeForName, parseTrackName } from './audio-math'

export interface SoundEffect {
  slot: number
  id: string
  name: string
  fileName: string
  mimeType: string
  blob: Blob
  gainDb: number
  createdAt: number
}

export const SOUND_EFFECT_PAD_SIZES = [4, 6, 8, 12, 16, 20] as const
export const DEFAULT_PAD_SIZE = 8

const DB_NAME = 'ipstream-live-effects'
const DB_VERSION = 1
const STORE = 'effects'
const PAD_SIZE_KEY = 'ipstream-live-effects-pad-size'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'))
  })
}

export async function loadEffects(): Promise<SoundEffect[]> {
  const db = await openDb()
  try {
    return await new Promise<SoundEffect[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve((req.result as SoundEffect[]) ?? [])
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function saveEffect(effect: SoundEffect): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(effect, effect.slot)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function deleteEffect(slot: number): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(slot)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export function loadPadSize(): number {
  if (typeof window === 'undefined') return DEFAULT_PAD_SIZE
  try {
    const value = Number(window.localStorage.getItem(PAD_SIZE_KEY))
    return (SOUND_EFFECT_PAD_SIZES as readonly number[]).includes(value)
      ? value
      : DEFAULT_PAD_SIZE
  } catch {
    return DEFAULT_PAD_SIZE
  }
}

export function savePadSize(size: number): void {
  if (typeof window === 'undefined') return
  const normalized = (SOUND_EFFECT_PAD_SIZES as readonly number[]).includes(size)
    ? size
    : DEFAULT_PAD_SIZE
  try {
    window.localStorage.setItem(PAD_SIZE_KEY, String(normalized))
  } catch {
    // Sin localStorage: el tamaño no persiste, pero la botonera sigue.
  }
}

export function createEffect(slot: number, file: File): SoundEffect {
  if (!isAudioFile(file.name, file.type)) {
    throw new Error('El archivo no es un audio compatible')
  }
  const parsed = parseTrackName(file.name)
  return {
    slot,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${slot}-${Date.now()}-${file.lastModified}`,
    name: parsed.title || file.name,
    fileName: file.name,
    mimeType: file.type || mimeForName(file.name),
    blob: file,
    gainDb: 0,
    createdAt: Date.now(),
  }
}

export function padSlots(
  effects: Map<number, SoundEffect>,
  padSize: number
): (SoundEffect | null)[] {
  return Array.from({ length: padSize }, (_, slot) => effects.get(slot) ?? null)
}
