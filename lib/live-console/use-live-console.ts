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

export interface UseLiveConsoleResult {
  engineReady: boolean
  library: {
    tracks: LocalTrack[]
    queue: LocalTrack[]
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
  cue: Record<DeckId, boolean>
  mic: MicSnapshot
  crossfader: number
  masterDb: number
  masterLevelDb: number
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

export function useLiveConsole(): UseLiveConsoleResult {
  const engineRef = useRef<LiveAudioEngine | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [snapshot, setSnapshot] = useState<EngineSnapshot>({
    decks: { A: { ...EMPTY_DECK, id: 'A' }, B: { ...EMPTY_DECK, id: 'B' } },
    mic: EMPTY_MIC,
    crossfader: 0.5,
    masterDb: 0,
    masterLevelDb: -Infinity,
    monitorEnabled: false,
    contextState: 'unavailable',
  })
  const [cue, setCue] = useState<Record<DeckId, boolean>>({ A: false, B: false })

  const [tracks, setTracks] = useState<LocalTrack[]>([])
  const [queue, setQueue] = useState<LocalTrack[]>([])
  const queueRef = useRef<LocalTrack[]>([])
  useEffect(() => { queueRef.current = queue }, [queue])

  const [scanning, setScanning] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [progress, setProgress] = useState({ scanned: 0, added: 0 })
  const [persisted, setPersisted] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

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

  const dequeue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((track) => track.id !== id))
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  // Restaurar índice cacheado al montar (sin pedir permisos)
  useEffect(() => {
    void (async () => {
      const cached = await loadCachedLibrary()
      if (cached.length > 0) setTracks(cached)
      const handle = await loadDirectoryHandle()
      if (handle) setPersisted(true)
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

  const updateNowPlaying = useCallback((deckId: DeckId) => {
    const engine = engineRef.current
    if (!engine) return
    const deck = engine.getDeck(deckId).snapshotTrack
    const next = queueRef.current[0] ?? null
    const payload = {
      title: deck?.title ?? null,
      artist: deck?.artist ?? null,
      nextTitle: next?.title ?? null,
      nextArtist: next?.artist ?? null,
    }
    setCurrent(payload)
    if (nowPlayingTimerRef.current) clearTimeout(nowPlayingTimerRef.current)
    nowPlayingTimerRef.current = setTimeout(() => {
      void sendNowPlaying(payload)
    }, 400)
  }, [sendNowPlaying])

  // Auto-advance cuando termina un deck
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.onDeckEnded = (id) => {
      const next = queueRef.current[0]
      if (!next) return
      setQueue((prev) => prev.filter((item) => item.id !== next.id))
      void (async () => {
        try {
          const file = await getFileForTrack(next)
          const mode = await engine.loadTrack(id, next, file)
          if (mode === 'buffer') detectBpm(id)
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
  }, [detectBpm, updateNowPlaying])

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
    if (mode === 'buffer') detectBpm(deckId)
    else engine.setDeckBpm(deckId, null, 0)
    setQueue((prev) => prev.filter((item) => item.id !== track.id))
    updateNowPlaying(deckId)
  }, [detectBpm, updateNowPlaying])

  const playDeck = useCallback(async (deckId: DeckId) => {
    const engine = engineRef.current
    if (!engine) return
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
        if (session.transport === 'whip') {
          // Liberar el slot del intento WHIP antes de pedir el fallback.
          const failedTransport = transportRef.current
          transportRef.current = null
          if (failedTransport) await failedTransport.stop()
          const failedId = sessionRef.current?.sessionId
          sessionRef.current = null
          setSessionId(null)
          if (failedId) await endSession(failedId)

          // El gate de calidad puede preferir WebSocket; reintentamos una vez.
          const fallback = await createSession('websocket')
          await startWithTransport(fallback)
        } else {
          throw primaryError
        }
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

  return {
    engineReady,
    library: {
      tracks,
      queue,
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
    cue,
    mic: snapshot.mic,
    crossfader: snapshot.crossfader,
    masterDb: snapshot.masterDb,
    masterLevelDb: snapshot.masterLevelDb,
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
