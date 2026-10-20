'use client'

// =====================================================
// Live Console — orquestación React
// =====================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveAudioEngine } from './audio-engine'
import {
  cacheLibrary,
  filesToTracks,
  getFileForTrack,
  hydrateDurations,
  loadCachedLibrary,
  loadDirectoryHandle,
  persistStorage,
  pickDirectory,
  saveDirectoryHandle,
  scanDirectory,
  supportsDirectoryPicker,
  verifyDirectoryPermission,
} from './library'
import { createTransport } from './transport'
import { buildPresenterText, normalizePhrases } from './presenter'
import { readLocalTags } from './local-tags'
import {
  DEFAULT_PAD_SIZE,
  SOUND_EFFECT_PAD_SIZES,
  createEffect,
  deleteEffect,
  loadEffects,
  loadPadSize,
  padSlots,
  saveEffect,
  savePadSize,
  type SoundEffect,
} from './effects'
import type {
  DeckEq,
  DeckId,
  DeckLoop,
  DeckSnapshot,
  EngineSnapshot,
  LocalTrack,
  MicSnapshot,
  SessionInfo,
  SessionState,
  SlotOption,
  TransportKind,
  TransportStats,
} from './types'

const EMPTY_DECK: DeckSnapshot = {
  id: 'A',
  track: null,
  playing: false,
  position: 0,
  duration: 0,
  gain: 0,
  eq: { low: 0, mid: 0, high: 0 },
  loop: { enabled: false, start: 0, end: 0, quantized: false },
  cue: false,
  bpm: null,
  bpmConfidence: 0,
  mode: null,
}

const EMPTY_MIC: MicSnapshot = {
  enabled: false,
  gain: 0,
  talkover: true,
  levelDb: -Infinity,
  permission: 'unknown',
}

const EMPTY_STATS: TransportStats = {
  bitrateKbps: null,
  rttMs: null,
  packetLoss: null,
  jitterMs: null,
  state: 'idle',
  error: null,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  }
  return data as T
}

function mergeTracks(current: LocalTrack[], incoming: LocalTrack[]): LocalTrack[] {
  const map = new Map(current.map((track) => [track.id, track]))
  for (const track of incoming) map.set(track.id, track)
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path))
}

export interface PlayerApi {
  current: LocalTrack | null
  nextTrack: LocalTrack | null
  playing: boolean
  position: number
  duration: number
  play: () => Promise<void>
  pause: () => void
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (seconds: number) => void
  playNow: (track: LocalTrack) => Promise<void>
  addToPlaylist: (track: LocalTrack) => void
  removeFromPlaylist: (id: string) => void
  clearPlaylist: () => void
  moveInPlaylist: (id: string, direction: -1 | 1) => void
}

export type AnnouncementType = 'weather' | 'time'
export type AnnouncementVoice = 'male' | 'female' | 'premium'

export interface AnnouncementsApi {
  announce: (type: AnnouncementType) => Promise<void>
  loading: AnnouncementType | null
  error: string | null
  voice: AnnouncementVoice
  setVoice: (voice: AnnouncementVoice) => void
}

export interface AiApi {
  enabled: boolean
  presenterEnabled: boolean
  every: number
  generating: boolean
  error: string | null
  remaining: number
  limit: number
  setPresenterEnabled: (enabled: boolean) => void
  setEvery: (every: number) => void
  generateSpeech: (text: string) => Promise<Blob>
  addSpot: (blob: Blob, text: string) => void
}

export interface SoundEffectsApi {
  padSize: number
  slots: (SoundEffect | null)[]
  loading: boolean
  error: string | null
  libraryMode: boolean
  addEffect: (slot: number, file: File) => Promise<void>
  removeEffect: (slot: number) => Promise<void>
  setGain: (slot: number, db: number) => Promise<void>
  play: (slot: number) => Promise<void>
  stopAll: () => void
  setPadSize: (size: number) => void
}

export interface UseLiveConsoleResult {
  engineReady: boolean
  library: {
    tracks: LocalTrack[]
    queue: LocalTrack[]
    history: LocalTrack[]
    scanning: boolean
    restoring: boolean
    progress: { scanned: number; added: number }
    persisted: boolean
    supportsPersistence: boolean
    error: string | null
    addFiles: (files: FileList | File[]) => void
    addDirectory: () => Promise<void>
    restoreDirectory: () => Promise<void>
    removeTrack: (id: string) => void
    enqueue: (track: LocalTrack) => void
    dequeue: (id: string) => void
    clearQueue: () => void
  }
  decks: Record<DeckId, DeckSnapshot>
  player: PlayerApi
  effects: SoundEffectsApi
  announcements: AnnouncementsApi
  ai: AiApi
  cue: Record<DeckId, boolean>
  mic: MicSnapshot
  crossfader: number
  masterDb: number
  masterLevelDb: number
  masterLevels: { left: number; right: number }
  session: {
    state: SessionState
    transport: TransportKind | null
    stats: TransportStats
    error: string | null
    slots: SlotOption[]
    maxDjs: number
    slotId: string | null
    mount: string | null
    bitrate: number
    streamBitrate: number
    sessionId: string | null
  }
  setSlotId: (id: string | null) => void
  headphonesConfirmed: boolean
  setHeadphonesConfirmed: (value: boolean) => void
  loadToDeck: (deckId: DeckId, track: LocalTrack) => Promise<void>
  playDeck: (deckId: DeckId) => Promise<void>
  pauseDeck: (deckId: DeckId) => void
  seekDeck: (deckId: DeckId, seconds: number) => void
  setDeckGain: (deckId: DeckId, db: number) => void
  setDeckEq: (deckId: DeckId, band: keyof DeckEq, db: number) => void
  setDeckLoop: (deckId: DeckId, loop: Partial<DeckLoop>) => void
  clearDeckLoop: (deckId: DeckId) => void
  toggleCue: (deckId: DeckId) => void
  setCrossfader: (position: number) => void
  setMasterDb: (db: number) => void
  monitorEnabled: boolean
  setMonitor: (enabled: boolean) => void
  enableMic: () => Promise<boolean>
  disableMic: () => void
  setMicGain: (db: number) => void
  setTalkover: (enabled: boolean) => void
  setMicCue: (enabled: boolean) => void
  goLive: () => Promise<void>
  stopLive: () => Promise<void>
  reconnect: () => Promise<void>
  refreshSlots: () => Promise<void>
  current: { title: string | null; artist: string | null; nextTitle: string | null; nextArtist: string | null }
}

function createSpotTrack(blob: Blob, text: string, duration: number | null = null): LocalTrack {
  const clean = text.replace(/\s+/g, ' ').trim()
  const file = new File([blob], `locucion-${Date.now()}.mp3`, {
    type: blob.type || 'audio/mpeg',
  })
  return {
    id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    path: file.name,
    title: clean.slice(0, 60) || 'Locución IA',
    artist: 'Locución IA',
    album: null,
    duration,
    size: file.size,
    lastModified: file.lastModified,
    mimeType: file.type || 'audio/mpeg',
    source: 'file',
    handle: null,
    file,
    available: true,
    kind: 'spot',
  }
}

export function useLiveConsole(
  options: {
    premiumVoiceAvailable?: boolean
    aiEnabled?: boolean
    stationName?: string
    aiRemaining?: number
    aiLimit?: number
    aiPresenterEnabled?: boolean
    aiPresenterEvery?: number
    aiIntroPhrases?: string[]
  } = {}
): UseLiveConsoleResult {
  const premiumVoiceAvailable = Boolean(options.premiumVoiceAvailable)
  const aiEnabled = Boolean(options.aiEnabled)
  const stationName = (options.stationName || 'la radio').trim() || 'la radio'
  const introPhrases = normalizePhrases(options.aiIntroPhrases)
  const engineRef = useRef<LiveAudioEngine | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [snapshot, setSnapshot] = useState<EngineSnapshot>({
    decks: { A: { ...EMPTY_DECK, id: 'A' }, B: { ...EMPTY_DECK, id: 'B' } },
    mic: EMPTY_MIC,
    crossfader: 0.5,
    masterDb: 0,
    masterLevelDb: -Infinity,
    masterLevels: { left: -Infinity, right: -Infinity },
    monitorEnabled: false,
    contextState: 'unavailable',
  })
  const [cue, setCue] = useState<Record<DeckId, boolean>>({ A: false, B: false })

  const [tracks, setTracks] = useState<LocalTrack[]>([])
  const [queue, setQueue] = useState<LocalTrack[]>([])
  const queueRef = useRef<LocalTrack[]>([])
  const historyRef = useRef<LocalTrack[]>([])
  const [history, setHistory] = useState<LocalTrack[]>([])
  const localMetaRef = useRef<Map<string, { title?: string; artist?: string; coverUrl?: string | null } | null>>(new Map())
  useEffect(() => { queueRef.current = queue }, [queue])

  const pushHistory = useCallback((track: LocalTrack) => {
    historyRef.current = [...historyRef.current, track].slice(-50)
    setHistory(historyRef.current)
  }, [])

  const popHistory = useCallback((): LocalTrack | null => {
    const track = historyRef.current.pop() ?? null
    setHistory([...historyRef.current])
    return track
  }, [])

  const [scanning, setScanning] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [progress, setProgress] = useState({ scanned: 0, added: 0 })
  const [persisted, setPersisted] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const [soundEffects, setSoundEffects] = useState<Map<number, SoundEffect>>(new Map())
  const [effectsLibraryMode, setEffectsLibraryMode] = useState(false)
  const [padSize, setPadSizeState] = useState(DEFAULT_PAD_SIZE)
  const [effectsLoading, setEffectsLoading] = useState(true)
  const [effectsError, setEffectsError] = useState<string | null>(null)
  const [announcementLoading, setAnnouncementLoading] = useState<AnnouncementType | null>(null)
  const [announcementError, setAnnouncementError] = useState<string | null>(null)
  const [announcementVoice, setAnnouncementVoice] = useState<AnnouncementVoice>(() => {
    if (typeof window === 'undefined') return premiumVoiceAvailable ? 'premium' : 'male'
    try {
      const stored = window.localStorage.getItem('live-announcement-voice')
      if (stored === 'premium' && premiumVoiceAvailable) return 'premium'
      if (stored === 'female' || stored === 'male') return stored
      return premiumVoiceAvailable ? 'premium' : 'male'
    } catch {
      return premiumVoiceAvailable ? 'premium' : 'male'
    }
  })
  const [aiPresenterEnabled, setAiPresenterEnabled] = useState(() => {
    if (typeof options.aiPresenterEnabled === 'boolean') return aiEnabled && options.aiPresenterEnabled
    if (!aiEnabled || typeof window === 'undefined') return aiEnabled
    try {
      return window.localStorage.getItem('live-ai-presenter-enabled') !== 'false'
    } catch {
      return true
    }
  })
  const [presenterEvery, setPresenterEvery] = useState(() => {
    if (typeof options.aiPresenterEvery === 'number') {
      return Math.min(10, Math.max(2, Math.round(options.aiPresenterEvery)))
    }
    if (typeof window === 'undefined') return 3
    try {
      const stored = Number(window.localStorage.getItem('live-ai-presenter-every') || 3)
      return Number.isFinite(stored) ? Math.min(10, Math.max(2, Math.round(stored))) : 3
    } catch {
      return 3
    }
  })
  const [presenterGenerating, setPresenterGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRemaining, setAiRemaining] = useState(Math.max(0, options.aiRemaining ?? 0))
  const aiLimit = Math.max(0, options.aiLimit ?? 0)
  const tracksSinceIntroRef = useRef(0)
  const introPrefetchRef = useRef<{ trackId: string; promise: Promise<Blob | null> } | null>(null)

  const effectsRef = useRef<Map<number, SoundEffect>>(new Map())
  const effectBuffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  useEffect(() => { effectsRef.current = soundEffects }, [soundEffects])

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [sessionTransport, setSessionTransport] = useState<TransportKind | null>(null)
  const [stats, setStats] = useState<TransportStats>(EMPTY_STATS)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [maxDjs, setMaxDjs] = useState(4)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [mount, setMount] = useState<string | null>(null)
  const [bitrate, setBitrate] = useState(192)
  const [streamBitrate, setStreamBitrate] = useState(192)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [headphonesConfirmed, setHeadphonesConfirmed] = useState(false)

  const transportRef = useRef<ReturnType<typeof createTransport> | null>(null)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const sessionRef = useRef<SessionInfo | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef(false)
  const currentDeckRef = useRef<DeckId>('A')
  const nowPlayingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [current, setCurrent] = useState<{
    title: string | null
    artist: string | null
    nextTitle: string | null
    nextArtist: string | null
  }>({ title: null, artist: null, nextTitle: null, nextArtist: null })

  // --------------------------------------------------
  // Motor
  // --------------------------------------------------
  useEffect(() => {
    const engine = new LiveAudioEngine()
    engineRef.current = engine
    setEngineReady(true)

    const timer = setInterval(() => {
      setSnapshot(engine.getSnapshot())
    }, 200)

    return () => {
      clearInterval(timer)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  // Con auriculares confirmados, monitorear el programa en la salida local.
  useEffect(() => {
    engineRef.current?.setMonitor(headphonesConfirmed)
  }, [headphonesConfirmed])

  // --------------------------------------------------
  // Biblioteca
  // --------------------------------------------------
  const applyScan = useCallback((scannedTracks: LocalTrack[]) => {
    setTracks((prev) => {
      const scannedIds = new Set(scannedTracks.map((track) => track.id))
      const reconciled = prev.map((track) =>
        track.handle && !scannedIds.has(track.id) ? { ...track, available: false } : track
      )
      const merged = mergeTracks(reconciled, scannedTracks)
      void cacheLibrary(merged)
      return merged
    })
    setProgress((prev) => ({ ...prev, added: scannedTracks.length }))
    void hydrateDurations(scannedTracks, (track, duration) => {
      setTracks((prev) => prev.map((item) => (item.id === track.id ? { ...item, duration } : item)))
    })
  }, [])

  const restoreDirectory = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      setLibraryError('Este navegador no permite recordar una carpeta. Elegí archivos por sesión.')
      return
    }
    setRestoring(true)
    setLibraryError(null)
    try {
      const handle = await loadDirectoryHandle()
      if (!handle) {
        setRestoring(false)
        return
      }
      const granted = await verifyDirectoryPermission(handle)
      if (!granted) {
        setLibraryError('Permiso de carpeta denegado. Volvé a autorizarla.')
        return
      }
      setScanning(true)
      setProgress({ scanned: 0, added: 0 })
      const handleScan = scanDirectory(handle, (next) => setProgress(next))
      const scanned = await handleScan.promise
      applyScan(scanned)
      setPersisted(true)
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : 'No se pudo restaurar la carpeta')
    } finally {
      setScanning(false)
      setRestoring(false)
    }
  }, [applyScan])

  const addDirectory = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      setLibraryError('Este navegador no permite recordar una carpeta. Usá "Agregar archivos".')
      return
    }
    const handle = await pickDirectory()
    if (!handle) return
    setScanning(true)
    setLibraryError(null)
    setProgress({ scanned: 0, added: 0 })
    try {
      await saveDirectoryHandle(handle)
      await persistStorage()
      const handleScan = scanDirectory(handle, (next) => setProgress(next))
      const scanned = await handleScan.promise
      applyScan(scanned)
      setPersisted(true)
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : 'No se pudo escanear la carpeta')
    } finally {
      setScanning(false)
    }
  }, [applyScan])

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = filesToTracks(files)
    if (incoming.length === 0) {
      setLibraryError('No se encontraron archivos de audio compatibles.')
      return
    }
    setLibraryError(null)
    setTracks((prev) => mergeTracks(prev, incoming))
    void hydrateDurations(incoming, (track, duration) => {
      setTracks((prev) => prev.map((item) => (item.id === track.id ? { ...item, duration } : item)))
    })
  }, [])

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((track) => track.id !== id))
    setQueue((prev) => prev.filter((track) => track.id !== id))
  }, [])

  const enqueue = useCallback((track: LocalTrack) => {
    setQueue((prev) => (prev.some((item) => item.id === track.id) ? prev : [...prev, track]))
  }, [])

  const addSpot = useCallback((blob: Blob, text: string) => {
    enqueue(createSpotTrack(blob, text))
  }, [enqueue])

  const dequeue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((track) => track.id !== id))
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  const moveInPlaylist = useCallback((id: string, direction: -1 | 1) => {
    setQueue((prev) => {
      const index = prev.findIndex((track) => track.id === id)
      if (index < 0) return prev
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const copy = [...prev]
      ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
      return copy
    })
  }, [])

  const addEffect = useCallback(async (slot: number, file: File) => {
    try {
      const effect = createEffect(slot, file)
      const previous = effectsRef.current.get(slot)
      await saveEffect(effect)
      if (previous) effectBuffersRef.current.delete(previous.id)
      setSoundEffects((prev) => {
        const next = new Map(prev)
        next.set(slot, effect)
        effectsRef.current = next
        return next
      })
      setEffectsError(null)
    } catch (err) {
      setEffectsError(err instanceof Error ? err.message : 'No se pudo agregar el efecto')
    }
  }, [])

  const removeEffect = useCallback(async (slot: number) => {
    try {
      const previous = effectsRef.current.get(slot)
      if (previous) effectBuffersRef.current.delete(previous.id)
      await deleteEffect(slot)
      setSoundEffects((prev) => {
        const next = new Map(prev)
        next.delete(slot)
        effectsRef.current = next
        return next
      })
      setEffectsError(null)
    } catch (err) {
      setEffectsError(err instanceof Error ? err.message : 'No se pudo quitar el efecto')
    }
  }, [])

  const setEffectGain = useCallback(async (slot: number, db: number) => {
    const current = effectsRef.current.get(slot)
    if (!current) return
    const updated = { ...current, gainDb: Math.max(-40, Math.min(6, db)) }
    try {
      await saveEffect(updated)
      setSoundEffects((prev) => {
        const next = new Map(prev)
        next.set(slot, updated)
        effectsRef.current = next
        return next
      })
    } catch (err) {
      setEffectsError(err instanceof Error ? err.message : 'No se pudo guardar el volumen')
    }
  }, [])

  const playEffect = useCallback(async (slot: number) => {
    const effect = effectsRef.current.get(slot)
    const engine = engineRef.current
    if (!effect || !engine) return
    try {
      await engine.resume()
      let buffer = effectBuffersRef.current.get(effect.id)
      if (!buffer) {
        buffer = await engine.decodeAudio(await effect.blob.arrayBuffer())
        effectBuffersRef.current.set(effect.id, buffer)
      }
      engine.playEffect(buffer, effect.gainDb)
      setEffectsError(null)
    } catch (err) {
      setEffectsError(err instanceof Error ? err.message : 'No se pudo reproducir el efecto')
    }
  }, [])

  const setAnnouncementVoicePersisted = useCallback((voice: AnnouncementVoice) => {
    setAnnouncementVoice(voice)
    try {
      window.localStorage.setItem('live-announcement-voice', voice)
    } catch {}
  }, [])

  const setAiPresenterEnabledPersisted = useCallback((enabled: boolean) => {
    setAiPresenterEnabled(enabled)
    if (!enabled) introPrefetchRef.current = null
    try {
      window.localStorage.setItem('live-ai-presenter-enabled', String(enabled))
    } catch {}
  }, [])

  const setPresenterEveryPersisted = useCallback((every: number) => {
    const value = Math.min(10, Math.max(2, Math.round(every)))
    setPresenterEvery(value)
    try {
      window.localStorage.setItem('live-ai-presenter-every', String(value))
    } catch {}
  }, [])

  const stopAllEffects = useCallback(() => {
    engineRef.current?.stopAllEffects()
  }, [])

  const announce = useCallback(async (type: AnnouncementType) => {
    const engine = engineRef.current
    if (!engine) return
    setAnnouncementLoading(type)
    setAnnouncementError(null)
    try {
      // La locución va al programa; activamos el monitor para escucharla
      // localmente y, si hay sesión, también sale al stream.
      engine.setMonitor(true)
      await engine.resume()
      const res = await fetch('/api/dashboard/streaming/live/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, voice: announcementVoice }),
      })
      if (!res.ok) {
        let message = 'No se pudo generar la locución.'
        try {
          const data = await res.json()
          message = data?.message || data?.error || message
        } catch {}
        throw new Error(message)
      }
      const remaining = res.headers.get('X-AI-Remaining')
      if (remaining != null) {
        const parsed = Number(remaining)
        if (Number.isFinite(parsed)) setAiRemaining(Math.max(0, parsed))
      }
      if (res.headers.get('X-TTS-Provider') === 'piper') {
        setAnnouncementError('Se usó Piper porque ElevenLabs no pudo generar la locución.')
      }
      const buffer = await engine.decodeAudio(await res.arrayBuffer())
      void engine.playAnnouncement(buffer)
    } catch (err) {
      setAnnouncementError(err instanceof Error ? err.message : 'No se pudo reproducir la locución')
    } finally {
      setAnnouncementLoading(null)
    }
  }, [announcementVoice])

  const generateSpeech = useCallback(async (text: string): Promise<Blob> => {
    const res = await fetch('/api/dashboard/streaming/live/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      let message = 'No se pudo generar la locución.'
      try {
        const data = await res.json()
        message = data?.message || data?.error || message
      } catch {}
      throw new Error(message)
    }
    const remaining = res.headers.get('X-AI-Remaining')
    if (remaining != null) {
      const parsed = Number(remaining)
      if (Number.isFinite(parsed)) setAiRemaining(Math.max(0, parsed))
    }
    if (res.headers.get('X-TTS-Provider') === 'piper') {
      setAiError('Se usó Piper porque ElevenLabs no pudo generar la locución.')
    } else {
      setAiError(null)
    }
    return res.blob()
  }, [])

  const setPadSize = useCallback((size: number) => {
    const normalized = (SOUND_EFFECT_PAD_SIZES as readonly number[]).includes(size)
      ? size
      : DEFAULT_PAD_SIZE
    savePadSize(normalized)
    setPadSizeState(normalized)
  }, [])

  // Restaurar índice cacheado al montar (sin pedir permisos)
  useEffect(() => {
    void (async () => {
      const cached = await loadCachedLibrary()
      if (cached.length > 0) setTracks(cached)
      const handle = await loadDirectoryHandle()
      if (handle) setPersisted(true)
    })()
  }, [])

  // Efectos de sonido: primero la biblioteca elegida por el cliente;
  // si no hay selección, se conserva la botonera local histórica.
  useEffect(() => {
    void (async () => {
      try {
        const storedPadSize = loadPadSize()
        setPadSizeState(storedPadSize)
        const res = await fetch('/api/dashboard/sound-effects', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const effects = Array.isArray(data?.effects) ? data.effects : []
          const selectedIds: string[] = Array.isArray(data?.selectedIds) ? data.selectedIds : []
          const byId = new Map<string, Record<string, unknown>>(
            effects.map((effect: Record<string, unknown>) => [String(effect.id), effect])
          )
          const selected = selectedIds
            .map((id) => byId.get(id))
            .filter((effect): effect is Record<string, unknown> => Boolean(effect))
          if (selected.length > 0) {
            const loaded: SoundEffect[] = []
            for (const effect of selected) {
              try {
                const audioRes = await fetch(String(effect.url))
                if (!audioRes.ok) continue
                const blob = await audioRes.blob()
                loaded.push({
                  slot: loaded.length,
                  id: String(effect.id),
                  name: String(effect.name || 'Efecto'),
                  fileName: String(effect.fileName || 'efecto'),
                  mimeType: String(effect.mimeType || blob.type || 'audio/mpeg'),
                  blob,
                  gainDb: 0,
                  createdAt: effect.createdAt ? Date.parse(String(effect.createdAt)) || Date.now() : Date.now(),
                })
              } catch {
                // Un efecto roto no debe bloquear al resto.
              }
            }
            if (loaded.length > 0) {
              const map = new Map(loaded.map((effect) => [effect.slot, effect]))
              effectsRef.current = map
              setSoundEffects(map)
              setEffectsLibraryMode(true)
              const neededSize = SOUND_EFFECT_PAD_SIZES.find((size) => size >= loaded.length)
              if (neededSize && neededSize > storedPadSize) {
                setPadSizeState(neededSize)
                savePadSize(neededSize)
              }
              return
            }
          }
        }
        const stored = await loadEffects()
        const map = new Map(stored.map((effect) => [effect.slot, effect]))
        effectsRef.current = map
        setSoundEffects(map)
      } catch (err) {
        try {
          const stored = await loadEffects()
          const map = new Map(stored.map((effect) => [effect.slot, effect]))
          effectsRef.current = map
          setSoundEffects(map)
        } catch {}
        setEffectsError(err instanceof Error ? err.message : 'No se pudieron cargar los efectos')
      } finally {
        setEffectsLoading(false)
      }
    })()
  }, [])

  // --------------------------------------------------
  // BPM
  // --------------------------------------------------
  const detectBpm = useCallback((deckId: DeckId) => {
    const engine = engineRef.current
    if (!engine) return
    const data = engine.getDeck(deckId).getAnalysisData()
    if (!data) {
      engine.setDeckBpm(deckId, null, 0)
      return
    }
    try {
      const worker = new Worker(new URL('./bpm.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<{ result: { bpm: number; confidence: number } | null }>) => {
        const result = event.data?.result
        engine.setDeckBpm(deckId, result?.bpm ?? null, result?.confidence ?? 0)
        worker.terminate()
      }
      worker.onerror = () => {
        engine.setDeckBpm(deckId, null, 0)
        worker.terminate()
      }
      worker.postMessage({ id: Date.now(), mono: data.mono, sampleRate: data.sampleRate }, [data.mono.buffer])
    } catch {
      engine.setDeckBpm(deckId, null, 0)
    }
  }, [])

  // --------------------------------------------------
  // API de sesión
  // --------------------------------------------------
  const createSession = useCallback(async (preferred?: TransportKind): Promise<SessionInfo> => {
    return jsonFetch<SessionInfo>('/api/dashboard/streaming/live/session', {
      method: 'POST',
      body: JSON.stringify({ slotId, transport: preferred }),
    })
  }, [slotId])

  const endSession = useCallback(async (id: string) => {
    try {
      await jsonFetch(`/api/dashboard/streaming/live/session`, {
        method: 'DELETE',
        body: JSON.stringify({ sessionId: id }),
      })
    } catch {
      // El cierre local es suficiente si el agente ya no responde.
    }
  }, [])

  const sendHeartbeat = useCallback(async (id: string) => {
    return jsonFetch<{ ok: boolean; state?: string; reason?: string }>('/api/dashboard/streaming/live/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ sessionId: id }),
    })
  }, [])

  const sendNowPlaying = useCallback(async (payload: {
    title: string | null
    artist: string | null
    nextTitle: string | null
    nextArtist: string | null
    nextCoverUrl?: string | null
    coverUrl?: string | null
  }) => {
    const id = sessionRef.current?.sessionId
    if (!id) return
    try {
      await jsonFetch('/api/dashboard/streaming/live/now-playing', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id, ...payload }),
      })
    } catch {
      // Metadata es best-effort.
    }
  }, [])

  const resolveLocalMetadata = useCallback(async (track: LocalTrack) => {
    if (!track.file && !track.handle) return null
    if (localMetaRef.current.has(track.id)) return localMetaRef.current.get(track.id) ?? null
    try {
      const file = await getFileForTrack(track)
      const tags = await readLocalTags(file)
      // Fallback: cover.jpg/folder.jpg junto a los audios, como muestran
      // los exploradores de escritorio.
      let cover: Blob | null = tags.picture ?? null
      if (!cover) {
        if (track.coverFile) cover = track.coverFile
        else if (track.coverHandle) cover = await track.coverHandle.getFile()
      }
      let coverUrl: string | null = null
      if (cover) {
        try {
          const form = new FormData()
          form.append('file', cover, cover instanceof File ? cover.name : 'cover.jpg')
          const res = await fetch('/api/dashboard/streaming/live/cover', {
            method: 'POST',
            body: form,
          })
          if (res.ok) {
            const data = await res.json()
            coverUrl = typeof data?.url === 'string' ? data.url : null
          }
        } catch {}
      }
      const value = {
        title: tags.title,
        artist: tags.artist,
        coverUrl,
      }
      localMetaRef.current.set(track.id, value)
      return value
    } catch {
      localMetaRef.current.set(track.id, null)
      return null
    }
  }, [])

  const updateNowPlaying = useCallback((deckId: DeckId) => {
    const engine = engineRef.current
    if (!engine) return
    const deck = engine.getDeck(deckId).snapshotTrack
    const next = queueRef.current.find((track) => track.kind !== 'spot') ?? null
    const payload = {
      title: deck?.title ?? null,
      artist: deck?.artist ?? null,
      nextTitle: next?.title ?? null,
      nextArtist: next?.artist ?? null,
      nextCoverUrl: null as string | null,
      coverUrl: null as string | null,
    }
    setCurrent({ title: payload.title, artist: payload.artist, nextTitle: payload.nextTitle, nextArtist: payload.nextArtist })
    if (nowPlayingTimerRef.current) clearTimeout(nowPlayingTimerRef.current)
    nowPlayingTimerRef.current = setTimeout(() => {
      void (async () => {
        let finalPayload = payload
        if (deck) {
          const meta = await resolveLocalMetadata(deck)
          if (meta) {
            finalPayload = {
              ...finalPayload,
              title: meta.title || finalPayload.title,
              artist: meta.artist || finalPayload.artist,
              coverUrl: meta.coverUrl ?? null,
            }
          }
        }
        if (next) {
          const nextMeta = await resolveLocalMetadata(next)
          if (nextMeta) {
            finalPayload = {
              ...finalPayload,
              nextTitle: nextMeta.title || finalPayload.nextTitle,
              nextArtist: nextMeta.artist || finalPayload.nextArtist,
              nextCoverUrl: nextMeta.coverUrl ?? null,
            }
          }
        }
        setCurrent({
          title: finalPayload.title,
          artist: finalPayload.artist,
          nextTitle: finalPayload.nextTitle,
          nextArtist: finalPayload.nextArtist,
        })
        void sendNowPlaying(finalPayload)
      })()
    }, 400)
  }, [sendNowPlaying, resolveLocalMetadata])

  // Si el usuario agrega/quita temas de la cola mientras está al aire,
  // refresca el "próximo" que consume la PWA.
  useEffect(() => {
    if (!sessionRef.current?.sessionId) return
    const deckId = currentDeckRef.current
    if (!deckId) return
    const timer = setTimeout(() => updateNowPlaying(deckId), 800)
    return () => clearTimeout(timer)
  }, [queue, updateNowPlaying])


  const maybePlayPresenter = useCallback(async (next: LocalTrack | null) => {
    if (!aiEnabled || !aiPresenterEnabled) return
    if (next?.kind === 'spot') return
    if (tracksSinceIntroRef.current < presenterEvery) return

    setPresenterGenerating(true)
    setAiError(null)
    const introText = buildPresenterText(stationName, next, introPhrases)
    try {
      let blob: Blob | null = null
      const prefetched =
        next && introPrefetchRef.current?.trackId === next.id
          ? introPrefetchRef.current.promise
          : null
      if (prefetched) {
        blob = await prefetched
      } else {
        const promise = generateSpeech(introText)
        introPrefetchRef.current = next ? { trackId: next.id, promise } : null
        blob = await promise
      }
      introPrefetchRef.current = null
      tracksSinceIntroRef.current = 0
      if (!blob) return
      const engine = engineRef.current
      if (!engine) return
      engine.setMonitor(true)
      const buffer = await engine.decodeAudio(await blob.arrayBuffer())
      await engine.playAnnouncement(buffer, 0, 15)
      pushHistory(createSpotTrack(blob, introText, buffer.duration))
    } catch (err) {
      introPrefetchRef.current = null
      tracksSinceIntroRef.current = 0
      setAiError(err instanceof Error ? err.message : 'No se pudo generar la presentación')
    } finally {
      setPresenterGenerating(false)
    }
  }, [aiEnabled, aiPresenterEnabled, presenterEvery, stationName, introPhrases, generateSpeech, pushHistory])

  // Pre-genera la presentación mientras suena el tema anterior.
  useEffect(() => {
    if (!aiEnabled || !aiPresenterEnabled) return
    if (tracksSinceIntroRef.current < presenterEvery) return
    const next = queue[0]
    if (!next || next.kind === 'spot') return
    if (introPrefetchRef.current?.trackId === next.id) return
    const promise = generateSpeech(buildPresenterText(stationName, next, introPhrases)).catch((err) => {
      setAiError(err instanceof Error ? err.message : 'No se pudo generar la presentación')
      return null
    })
    introPrefetchRef.current = { trackId: next.id, promise }
  }, [queue, aiEnabled, aiPresenterEnabled, presenterEvery, stationName, introPhrases, generateSpeech])

  // Auto-advance cuando termina un deck
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.onDeckEnded = (id) => {
      if (id === 'A') {
        const ended = engine.getDeck('A').snapshotTrack
        if (ended) pushHistory(ended)
      }
      const next = queueRef.current[0] ?? null
      void (async () => {
        try {
          await maybePlayPresenter(next)
          if (!next) return
          if (next.kind !== 'spot') tracksSinceIntroRef.current += 1
          setQueue((prev) => prev.filter((item) => item.id !== next.id))
          const file = await getFileForTrack(next)
          const mode = await engine.loadTrack(id, next, file)
          if (mode === 'buffer' && next.kind !== 'spot') detectBpm(id)
          await engine.resume()
          await engine.getDeck(id).play()
          currentDeckRef.current = id
          updateNowPlaying(id)
        } catch (err) {
          setLibraryError(err instanceof Error ? err.message : 'No se pudo reproducir el siguiente track')
        }
      })()
    }
    return () => {
      engine.onDeckEnded = null
    }
  }, [detectBpm, updateNowPlaying, maybePlayPresenter, pushHistory])

  const refreshSlots = useCallback(async () => {
    try {
      const data = await jsonFetch<{
        djSlots?: Array<Record<string, unknown>>
        planMaxDjs?: number
        djConnected?: boolean
      }>('/api/dashboard/streaming/connection')
      const mapped: SlotOption[] = Array.isArray(data.djSlots) && data.djSlots.length > 0
        ? data.djSlots.map((slot) => ({
            id: typeof slot.id === 'string' ? slot.id : null,
            name: String(slot.name ?? 'DJ'),
            mount: String(slot.mount ?? '/live'),
            role: String(slot.role ?? 'guest'),
            priority: Number(slot.priority ?? 1),
            connected: Boolean(slot.connected),
            onAir: Boolean(slot.onAir),
          }))
        : [{
            id: null,
            name: 'DJ en vivo',
            mount: '/live',
            role: 'owner',
            priority: 1,
            connected: Boolean(data.djConnected),
            onAir: Boolean(data.djConnected),
          }]
      setSlots(mapped)
      setMaxDjs(typeof data.planMaxDjs === 'number' ? data.planMaxDjs : 4)
      if (!slotId) setSlotId(mapped[0]?.id ?? null)
    } catch {
      setSlots([])
    }
  }, [slotId])

  useEffect(() => {
    void refreshSlots()
  }, [refreshSlots])

  // --------------------------------------------------
  // Controles de deck
  // --------------------------------------------------
  const loadToDeck = useCallback(async (deckId: DeckId, track: LocalTrack) => {
    const engine = engineRef.current
    if (!engine) return
    await engine.resume()
    const file = await getFileForTrack(track)
    const mode = await engine.loadTrack(deckId, track, file)
    if (mode === 'buffer' && track.kind !== 'spot') detectBpm(deckId)
    else engine.setDeckBpm(deckId, null, 0)
    if (track.kind !== 'spot') tracksSinceIntroRef.current += 1
    setQueue((prev) => prev.filter((item) => item.id !== track.id))
    updateNowPlaying(deckId)
  }, [detectBpm, updateNowPlaying])

  const playDeck = useCallback(async (deckId: DeckId) => {
    const engine = engineRef.current
    if (!engine) return
    // Al reproducir desde la consola, monitorear el programa en la salida
    // local para que el usuario escuche aunque todavía no esté al aire.
    engine.setMonitor(true)
    await engine.resume()
    await engine.getDeck(deckId).play()
    currentDeckRef.current = deckId
    updateNowPlaying(deckId)
  }, [updateNowPlaying])

  const pauseDeck = useCallback((deckId: DeckId) => {
    engineRef.current?.getDeck(deckId).pause()
  }, [])

  const seekDeck = useCallback((deckId: DeckId, seconds: number) => {
    engineRef.current?.getDeck(deckId).seek(seconds)
  }, [])

  const rememberCurrent = useCallback(() => {
    const current = engineRef.current?.getDeck('A').snapshotTrack
    if (!current) return
    pushHistory(current)
  }, [pushHistory])

  const playNow = useCallback(async (track: LocalTrack) => {
    const engine = engineRef.current
    if (!engine) return
    const current = engine.getDeck('A').snapshotTrack
    if (current?.id === track.id) {
      await playDeck('A')
      return
    }
    await maybePlayPresenter(track)
    if (current) rememberCurrent()
    await loadToDeck('A', track)
    await playDeck('A')
  }, [loadToDeck, playDeck, rememberCurrent, maybePlayPresenter])

  const playNext = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const nextTrack = queueRef.current[0]
    if (!nextTrack) {
      await maybePlayPresenter(null)
      engine.getDeck('A').stop()
      return
    }
    await maybePlayPresenter(nextTrack)
    rememberCurrent()
    await loadToDeck('A', nextTrack)
    await playDeck('A')
  }, [loadToDeck, playDeck, rememberCurrent, maybePlayPresenter])

  const playPrevious = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const previousTrack = popHistory()
    if (!previousTrack) {
      engine.getDeck('A').seek(0)
      return
    }
    const current = engine.getDeck('A').snapshotTrack
    if (current) {
      setQueue((prev) => [current, ...prev.filter((track) => track.id !== current.id)])
    }
    await loadToDeck('A', previousTrack)
    await playDeck('A')
  }, [loadToDeck, playDeck, popHistory])

  const playerPlay = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const deck = engine.getDeck('A')
    if (deck.snapshotTrack) {
      if (deck.getPosition() >= deck.getDuration() - 0.5) deck.seek(0)
      await playDeck('A')
      return
    }
    const first = queueRef.current[0]
    if (first) {
      await playNow(first)
      return
    }
    // Si no hay nada cargado ni en cola, arrancar con el primer archivo
    // de la biblioteca local. Así el botón Play del reproductor no queda
    // muerto después de agregar una carpeta.
    const libraryFirst = tracks[0]
    if (libraryFirst) await playNow(libraryFirst)
  }, [playDeck, playNow, tracks])

  const playerPause = useCallback(() => pauseDeck('A'), [pauseDeck])
  const playerSeek = useCallback((seconds: number) => seekDeck('A', seconds), [seekDeck])

  const setDeckGain = useCallback((deckId: DeckId, db: number) => {
    engineRef.current?.setDeckGain(deckId, db)
  }, [])

  const setDeckEq = useCallback((deckId: DeckId, band: keyof DeckEq, db: number) => {
    engineRef.current?.setDeckEq(deckId, band, db)
  }, [])

  const setDeckLoop = useCallback((deckId: DeckId, loop: Partial<DeckLoop>) => {
    engineRef.current?.setDeckLoop(deckId, loop)
  }, [])

  const clearDeckLoop = useCallback((deckId: DeckId) => {
    engineRef.current?.clearDeckLoop(deckId)
  }, [])

  const toggleCue = useCallback((deckId: DeckId) => {
    setCue((prev) => {
      const next = { ...prev, [deckId]: !prev[deckId] }
      engineRef.current?.setDeckCue(deckId, next[deckId])
      return next
    })
  }, [])

  const setCrossfader = useCallback((position: number) => {
    engineRef.current?.setCrossfader(position)
  }, [])

  const setMasterDb = useCallback((db: number) => {
    engineRef.current?.setMasterDb(db)
  }, [])

  const setMonitor = useCallback((enabled: boolean) => {
    engineRef.current?.setMonitor(enabled)
  }, [])

  const enableMic = useCallback(async () => {
    const ok = await engineRef.current?.enableMic()
    return Boolean(ok)
  }, [])

  const disableMic = useCallback(() => {
    engineRef.current?.disableMic()
  }, [])

  const setMicGain = useCallback((db: number) => {
    engineRef.current?.setMicGain(db)
  }, [])

  const setTalkover = useCallback((enabled: boolean) => {
    engineRef.current?.setTalkover(enabled)
  }, [])

  const setMicCue = useCallback((enabled: boolean) => {
    engineRef.current?.setMicCue(enabled)
  }, [])

  // --------------------------------------------------
  // Sesión en vivo
  // --------------------------------------------------
  const acquireWakeLock = useCallback(async () => {
    try {
      const api = (navigator as unknown as { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock
      if (api?.request) wakeLockRef.current = await api.request('screen')
    } catch {
      // Sin wake lock: la sesión sigue, solo se avisa en la UI.
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release()
    } catch {
      // ignorar
    }
    wakeLockRef.current = null
  }, [])

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    if (statsRef.current) clearInterval(statsRef.current)
    heartbeatRef.current = null
    statsRef.current = null
  }, [])

  // El agente corta la fuente por silencio y vuelve el AutoDJ. No reconectar
  // automáticamente: el usuario debe volver a salir al aire cuando tenga audio.
  const handleRemoteEnd = useCallback(async (reason: string) => {
    clearTimers()
    reconnectRef.current = false
    const transport = transportRef.current
    transportRef.current = null
    if (transport) await transport.stop()
    sessionRef.current = null
    await releaseWakeLock()
    setSessionId(null)
    setSessionState('ended')
    setStats(EMPTY_STATS)
    setSessionError(
      reason === 'silence'
        ? 'AutoDJ retomó el control por silencio. Cuando vuelvas a tener audio, salí al aire de nuevo.'
        : 'La sesión terminó.'
    )
  }, [clearTimers, releaseWakeLock])

  const stopLive = useCallback(async () => {
    clearTimers()
    const transport = transportRef.current
    transportRef.current = null
    if (transport) await transport.stop()
    const id = sessionRef.current?.sessionId ?? null
    sessionRef.current = null
    if (id) await endSession(id)
    await releaseWakeLock()
    setSessionId(null)
    setSessionState('ended')
    setStats(EMPTY_STATS)
  }, [clearTimers, endSession, releaseWakeLock])

  const startWithTransport = useCallback(async (session: SessionInfo) => {
    const engine = engineRef.current
    if (!engine) throw new Error('El motor de audio no está listo')
    clearTimers()
    await engine.resume()
    const transport = createTransport(session.transport)
    transportRef.current = transport

    setSessionTransport(session.transport)
    setSessionId(session.sessionId)
    setMount(session.mount)
    setBitrate(session.bitrate)
    setStreamBitrate(session.streamBitrate ?? session.bitrate)
    sessionRef.current = session
    setSessionState('connecting')
    setSessionError(null)

    await transport.start(engine.stream, session)
    setSessionState('live')

    heartbeatRef.current = setInterval(async () => {
      try {
        const result = await sendHeartbeat(session.sessionId)
        if (!result.ok) {
          if (result.reason === 'silence') {
            await handleRemoteEnd('silence')
            return
          }
          throw new Error(result.reason || 'Sesión expirada')
        }
      } catch (err) {
        if (!reconnectRef.current) {
          reconnectRef.current = true
          setSessionState('reconnecting')
          setSessionError(err instanceof Error ? err.message : 'Se perdió la sesión')
          await sleep(1200)
          try {
            await transport.stop()
            await endSession(session.sessionId)
            const fresh = await createSession(session.transport)
            await startWithTransport(fresh)
          } catch (reconnectError) {
            setSessionState('error')
            setSessionError(reconnectError instanceof Error ? reconnectError.message : 'No se pudo reconectar')
          } finally {
            reconnectRef.current = false
          }
        }
      }
    }, 10000)

    statsRef.current = setInterval(async () => {
      const next = await transport.getStats()
      setStats(next)
      if (next.reason === 'silence') {
        await handleRemoteEnd('silence')
        return
      }
      if (next.state === 'error' && !reconnectRef.current) {
        const hb = await sendHeartbeat(session.sessionId).catch(() => null)
        if (hb && hb.reason === 'silence') {
          await handleRemoteEnd('silence')
          return
        }
        reconnectRef.current = true
        setSessionState('reconnecting')
        setSessionError(next.error ?? 'Error de transporte')
        try {
          await transport.stop()
          await endSession(session.sessionId)
          const fresh = await createSession(session.transport)
          await startWithTransport(fresh)
        } catch (err) {
          setSessionState('error')
          setSessionError(err instanceof Error ? err.message : 'No se pudo reconectar')
        } finally {
          reconnectRef.current = false
        }
      }
    }, 2000)
  }, [clearTimers, createSession, endSession, handleRemoteEnd, sendHeartbeat])

  const goLive = useCallback(async () => {
    if (!headphonesConfirmed) {
      setSessionError('Confirmá que vas a monitorear con auriculares antes de salir al aire.')
      return
    }
    if (!engineRef.current) return
    setSessionState('preparing')
    setSessionError(null)
    try {
      const session = await createSession()
      try {
        await startWithTransport(session)
      } catch (primaryError) {
        const fallbackKind = session.transport === 'whip' ? 'websocket' : 'whip'
        // Liberar el slot del intento fallido antes de pedir el fallback.
        const failedTransport = transportRef.current
        transportRef.current = null
        if (failedTransport) await failedTransport.stop()
        const failedId = sessionRef.current?.sessionId
        sessionRef.current = null
        setSessionId(null)
        if (failedId) await endSession(failedId)

        // Reintentamos una vez con el otro transporte.
        const fallback = await createSession(fallbackKind)
        await startWithTransport(fallback)
      }
      await acquireWakeLock()
      updateNowPlaying(currentDeckRef.current)
    } catch (err) {
      clearTimers()
      await releaseWakeLock()
      setSessionState('error')
      setSessionError(err instanceof Error ? err.message : 'No se pudo salir al aire')
      const transport = transportRef.current
      transportRef.current = null
      if (transport) await transport.stop()
      const id = sessionRef.current?.sessionId
      sessionRef.current = null
      if (id) await endSession(id)
      setSessionId(null)
    }
  }, [acquireWakeLock, clearTimers, createSession, endSession, headphonesConfirmed, releaseWakeLock, startWithTransport, updateNowPlaying])

  const reconnect = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    setSessionState('reconnecting')
    setSessionError(null)
    try {
      const transport = transportRef.current
      if (transport) await transport.stop()
      await endSession(session.sessionId)
      const fresh = await createSession(session.transport)
      await startWithTransport(fresh)
    } catch (err) {
      setSessionState('error')
      setSessionError(err instanceof Error ? err.message : 'No se pudo reconectar')
    }
  }, [createSession, endSession, startWithTransport])

  // Heartbeat/candle de vida al cerrar la pestaña
  useEffect(() => {
    const handleUnload = () => {
      const id = sessionRef.current?.sessionId
      if (!id) return
      try {
        navigator.sendBeacon(
          '/api/dashboard/streaming/live/heartbeat',
          new Blob([JSON.stringify({ sessionId: id, end: true })], { type: 'application/json' })
        )
      } catch {}
    }
    window.addEventListener('pagehide', handleUnload)
    return () => window.removeEventListener('pagehide', handleUnload)
  }, [])

  useEffect(() => () => {
    clearTimers()
    void releaseWakeLock()
    void transportRef.current?.stop()
    transportRef.current = null
  }, [clearTimers, releaseWakeLock])

  const decks = useMemo(() => ({
    A: { ...snapshot.decks.A, cue: cue.A },
    B: { ...snapshot.decks.B, cue: cue.B },
  }), [snapshot, cue])

  const effectSlots = useMemo(
    () => padSlots(soundEffects, padSize),
    [soundEffects, padSize]
  )

  const effects = useMemo<SoundEffectsApi>(() => ({
    padSize,
    slots: effectSlots,
    loading: effectsLoading,
    error: effectsError,
    libraryMode: effectsLibraryMode,
    addEffect,
    removeEffect,
    setGain: setEffectGain,
    play: playEffect,
    stopAll: stopAllEffects,
    setPadSize,
  }), [
    padSize,
    effectSlots,
    effectsLoading,
    effectsError,
    effectsLibraryMode,
    addEffect,
    removeEffect,
    setEffectGain,
    playEffect,
    stopAllEffects,
    setPadSize,
  ])

  const announcements = useMemo<AnnouncementsApi>(() => ({
    announce,
    loading: announcementLoading,
    error: announcementError,
    voice: announcementVoice,
    setVoice: setAnnouncementVoicePersisted,
  }), [announce, announcementLoading, announcementError, announcementVoice, setAnnouncementVoicePersisted])

  const ai = useMemo<AiApi>(() => ({
    enabled: aiEnabled,
    presenterEnabled: aiPresenterEnabled,
    every: presenterEvery,
    generating: presenterGenerating,
    error: aiError,
    remaining: aiRemaining,
    limit: aiLimit,
    setPresenterEnabled: setAiPresenterEnabledPersisted,
    setEvery: setPresenterEveryPersisted,
    generateSpeech,
    addSpot,
  }), [
    aiEnabled,
    aiPresenterEnabled,
    presenterEvery,
    presenterGenerating,
    aiError,
    aiRemaining,
    aiLimit,
    setAiPresenterEnabledPersisted,
    setPresenterEveryPersisted,
    generateSpeech,
    addSpot,
  ])

  const player = useMemo<PlayerApi>(() => ({
    current: decks.A.track,
    nextTrack: queue[0] ?? null,
    playing: decks.A.playing,
    position: decks.A.position,
    duration: decks.A.duration,
    play: playerPlay,
    pause: playerPause,
    next: playNext,
    previous: playPrevious,
    seek: playerSeek,
    playNow,
    addToPlaylist: enqueue,
    removeFromPlaylist: dequeue,
    clearPlaylist: clearQueue,
    moveInPlaylist,
  }), [
    decks,
    queue,
    playerPlay,
    playerPause,
    playNext,
    playPrevious,
    playerSeek,
    playNow,
    enqueue,
    dequeue,
    clearQueue,
    moveInPlaylist,
  ])

  return {
    engineReady,
    library: {
      tracks,
      queue,
      history,
      scanning,
      restoring,
      progress,
      persisted,
      supportsPersistence: supportsDirectoryPicker(),
      error: libraryError,
      addFiles,
      addDirectory,
      restoreDirectory,
      removeTrack,
      enqueue,
      dequeue,
      clearQueue,
    },
    decks,
    player,
    effects,
    announcements,
    ai,
    cue,
    mic: snapshot.mic,
    crossfader: snapshot.crossfader,
    masterDb: snapshot.masterDb,
    masterLevelDb: snapshot.masterLevelDb,
    masterLevels: snapshot.masterLevels,
    monitorEnabled: snapshot.monitorEnabled,
    session: {
      state: sessionState,
      transport: sessionTransport,
      stats,
      error: sessionError,
      slots,
      maxDjs,
      slotId,
      mount,
      bitrate,
      streamBitrate,
      sessionId,
    },
    setSlotId,
    headphonesConfirmed,
    setHeadphonesConfirmed,
    loadToDeck,
    playDeck,
    pauseDeck,
    seekDeck,
    setDeckGain,
    setDeckEq,
    setDeckLoop,
    clearDeckLoop,
    toggleCue,
    setCrossfader,
    setMasterDb,
    setMonitor,
    enableMic,
    disableMic,
    setMicGain,
    setTalkover,
    setMicCue,
    goLive,
    stopLive,
    reconnect,
    refreshSlots,
    current,
  }
}
