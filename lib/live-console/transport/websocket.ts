// =====================================================
// Live Console — transporte WebSocket (fallback)
// =====================================================
// MediaRecorder -> chunks binarios -> agente -> FFmpeg -> harbor.
// No requiere UDP; la latencia es mayor que WHIP.

import type { LiveTransport, SessionInfo, TransportStats } from '../types'

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export class WebSocketTransport implements LiveTransport {
  readonly kind = 'websocket' as const
  private ws: WebSocket | null = null
  private recorder: MediaRecorder | null = null
  private state: TransportStats['state'] = 'idle'
  private error: string | null = null
  private bytesSent = 0
  private startedAt = 0
  private lastBitrate = 0
  private closeCode: number | null = null
  private closeReason: string | null = null

  async start(stream: MediaStream, session: SessionInfo): Promise<void> {
    if (!session.wsUrl) throw new Error('La sesión no expone una URL WebSocket')
    const mimeType = pickMimeType()
    if (!mimeType) {
      this.state = 'error'
      this.error = 'Este navegador no soporta MediaRecorder para audio'
      throw new Error(this.error)
    }

    const url = new URL(session.wsUrl)
    url.searchParams.set('session', session.sessionId)

    this.state = 'connecting'
    this.error = null
    this.bytesSent = 0
    this.startedAt = Date.now()
    this.lastBitrate = 0

    // El token viaja como subprotocolo para no quedar en el access log.
    const ws = new WebSocket(url.toString(), [session.token])
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout conectando WebSocket')), 8000)
      ws.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      ws.onerror = () => {
        clearTimeout(timer)
        reject(new Error('No se pudo conectar el WebSocket'))
      }
    })

    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 192000 })
    this.recorder = recorder
    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return
      if (ws.readyState !== WebSocket.OPEN) return
      const buffer = await event.data.arrayBuffer()
      this.bytesSent += buffer.byteLength
      ws.send(buffer)
    }
    recorder.onerror = () => {
      this.state = 'error'
      this.error = 'Error del grabador de audio'
    }
    recorder.start(250)
    this.state = 'live'

    ws.onclose = (event) => {
      this.closeCode = event.code
      this.closeReason = event.reason || null
      if (this.state !== 'closed') {
        this.state = 'error'
        this.error = event.reason
          ? `El servidor cerró la conexión: ${event.reason}`
          : 'El servidor cerró la conexión de audio'
      }
    }
  }

  async stop(): Promise<void> {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop() } catch {}
    }
    this.recorder = null
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this.state = 'closed'
  }

  async getStats(): Promise<TransportStats> {
    const elapsed = (Date.now() - this.startedAt) / 1000
    if (elapsed > 0.5 && this.bytesSent > 0) {
      this.lastBitrate = Math.round((this.bytesSent * 8) / 1000 / elapsed)
    }
    return {
      bitrateKbps: this.lastBitrate || null,
      rttMs: null,
      packetLoss: null,
      jitterMs: null,
      state: this.state,
      error: this.error,
      reason: this.closeCode === 4410 || this.closeReason === 'silence' ? 'silence' : null,
    }
  }
}
