// =====================================================
// Live Console — transporte WHIP (WebRTC)
// =====================================================

import type { LiveTransport, SessionInfo, TransportStats } from '../types'

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(done, timeoutMs)
    function done() {
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    function check() {
      if (pc.iceGatheringState === 'complete') done()
    }
    pc.addEventListener('icegatheringstatechange', check)
  })
}

export class WhipTransport implements LiveTransport {
  readonly kind = 'whip' as const
  private pc: RTCPeerConnection | null = null
  private resourceUrl: string | null = null
  private token = ''
  private state: TransportStats['state'] = 'idle'
  private error: string | null = null
  private sender: RTCRtpSender | null = null

  async start(stream: MediaStream, session: SessionInfo): Promise<void> {
    if (!session.whipUrl) throw new Error('La sesión no expone una URL WHIP')
    this.token = session.token
    this.state = 'connecting'
    this.error = null

    const pc = new RTCPeerConnection({ iceServers: session.iceServers ?? [] })
    this.pc = pc

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') this.state = 'live'
      else if (pc.connectionState === 'failed') {
        this.state = 'error'
        this.error = 'No se pudo establecer la conexión WebRTC'
      } else if (pc.connectionState === 'disconnected') {
        this.state = 'reconnecting'
      } else if (pc.connectionState === 'closed') {
        this.state = 'closed'
      }
    }

    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) throw new Error('La mezcla no tiene una pista de audio')
    this.sender = pc.addTrack(audioTrack, stream)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waitForIceGathering(pc)

    const res = await fetch(session.whipUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp',
      },
      body: pc.localDescription?.sdp ?? '',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      this.state = 'error'
      this.error = `WHIP ${res.status}: ${text.slice(0, 160)}`
      throw new Error(this.error)
    }

    this.resourceUrl = res.headers.get('Location')
    const answer = await res.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answer })
    this.state = 'live'
  }

  async stop(): Promise<void> {
    const pc = this.pc
    this.pc = null
    if (this.resourceUrl) {
      try {
        await fetch(this.resourceUrl, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` },
        })
      } catch {
        // El cierre local es suficiente si el recurso ya no existe.
      }
      this.resourceUrl = null
    }
    if (pc) {
      pc.onconnectionstatechange = null
      pc.close()
    }
    this.sender = null
    this.state = 'closed'
  }

  async getStats(): Promise<TransportStats> {
    const base: TransportStats = {
      bitrateKbps: null,
      rttMs: null,
      packetLoss: null,
      jitterMs: null,
      state: this.state,
      error: this.error,
      reason: null,
    }
    if (!this.pc) return base

    try {
      const reports = await this.pc.getStats()
      let outbound: any = null
      let remoteInbound: any = null
      let candidatePair: any = null

      reports.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'audio') outbound = report
        if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') remoteInbound = report
        if (report.type === 'candidate-pair' && report.state === 'succeeded') candidatePair = report
      })

      if (outbound?.bytesSent && outbound?.timestamp) {
        const key = '__whip_last'
        const store = globalThis as unknown as Record<string, { bytes: number; at: number } | undefined>
        const previous = store[key]
        if (previous) {
          const elapsed = (outbound.timestamp - previous.at) / 1000
          if (elapsed > 0.2) {
            base.bitrateKbps = Math.round(((outbound.bytesSent - previous.bytes) * 8) / 1000 / elapsed)
          }
        }
        store[key] = { bytes: outbound.bytesSent, at: outbound.timestamp }
      }

      if (remoteInbound) {
        if (typeof remoteInbound.roundTripTime === 'number') {
          base.rttMs = Math.round(remoteInbound.roundTripTime * 1000)
        }
        if (typeof remoteInbound.jitter === 'number') {
          base.jitterMs = Math.round(remoteInbound.jitter * 1000)
        }
        if (typeof remoteInbound.fractionLost === 'number') {
          base.packetLoss = Math.round(remoteInbound.fractionLost * 100)
        }
      } else if (candidatePair?.currentRoundTripTime) {
        base.rttMs = Math.round(candidatePair.currentRoundTripTime * 1000)
      }
    } catch {
      // Stats no disponibles; no es fatal.
    }

    return base
  }
}
