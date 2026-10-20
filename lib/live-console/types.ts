// =====================================================
// Live Console — contratos compartidos
// =====================================================

export type DeckId = 'A' | 'B'
export type TransportKind = 'whip' | 'websocket'
export type SessionState =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'ended'
  | 'error'

export interface LocalTrack {
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
  source: 'handle' | 'file'
  handle?: FileSystemFileHandle | null
  file?: File | null
  /** Portada sidecar (cover.jpg/folder.jpg) del directorio. */
  coverHandle?: FileSystemFileHandle | null
  coverFile?: File | null
  available: boolean
  /** 'spot' = locución generada por IA; no cuenta para el presentador. */
  kind?: 'music' | 'spot'
}

export interface DeckEq {
  low: number
  mid: number
  high: number
}

export interface DeckLoop {
  enabled: boolean
  start: number
  end: number
  quantized: boolean
}

export interface DeckSnapshot {
  id: DeckId
  track: LocalTrack | null
  playing: boolean
  position: number
  duration: number
  gain: number
  eq: DeckEq
  loop: DeckLoop
  cue: boolean
  bpm: number | null
  bpmConfidence: number
  mode: 'buffer' | 'element' | null
}

export interface MicSnapshot {
  enabled: boolean
  gain: number
  talkover: boolean
  levelDb: number
  permission: 'unknown' | 'granted' | 'denied' | 'unavailable'
}

export interface EngineSnapshot {
  decks: Record<DeckId, DeckSnapshot>
  mic: MicSnapshot
  crossfader: number
  masterDb: number
  masterLevelDb: number
  masterLevels: { left: number; right: number }
  monitorEnabled: boolean
  contextState: AudioContextState | 'unavailable'
}

export interface SessionInfo {
  sessionId: string
  token: string
  transport: TransportKind
  whipUrl: string | null
  wsUrl: string | null
  slotId: string | null
  slotName: string | null
  mount: string
  bitrate: number
  streamBitrate?: number
  expiresAt: string
  iceServers: RTCIceServer[]
}

export interface TransportStats {
  bitrateKbps: number | null
  rttMs: number | null
  packetLoss: number | null
  jitterMs: number | null
  state: 'idle' | 'connecting' | 'live' | 'reconnecting' | 'closed' | 'error'
  error?: string | null
  reason?: string | null
}

export interface LiveTransport {
  readonly kind: TransportKind
  start(stream: MediaStream, session: SessionInfo): Promise<void>
  stop(): Promise<void>
  getStats(): Promise<TransportStats>
}

export interface SlotOption {
  id: string | null
  name: string
  mount: string
  role: string
  priority: number
  connected: boolean
  onAir: boolean
}

export interface LiveSessionResponse {
  sessionId: string
  token: string
  transport: TransportKind
  whipUrl: string | null
  wsUrl: string | null
  slotId: string | null
  slotName: string | null
  mount: string
  bitrate: number
  streamBitrate?: number
  expiresAt: string
  iceServers: RTCIceServer[]
}

export interface LiveConsoleApi {
  createSession: (slotId: string | null) => Promise<LiveSessionResponse>
  endSession: (sessionId: string) => Promise<void>
  heartbeat: (sessionId: string) => Promise<{ ok: boolean; state?: string; reason?: string }>
  updateNowPlaying: (payload: {
    sessionId: string
    title: string | null
    artist: string | null
    nextTitle?: string | null
    nextArtist?: string | null
  }) => Promise<void>
  getSlots: () => Promise<{ slots: SlotOption[]; maxDjs: number }>
}
