// =====================================================
// Live Console — motor de audio
// =====================================================
// Programa: Decks -> crossfader -> música -> duck -> master -> limitador
//           -> MediaStreamAudioDestination (al transporte)
// Cue:      Decks -> cueGain -> cueBus -> salida local (auriculares)
// Mic:      mic -> HPF -> compresor -> master (y sidetone opcional al cue)

import { dbToGain, equalPowerGains, computeRms, gainToDb, clamp } from './audio-math'
import { Deck } from './deck'
import type {
  DeckEq,
  DeckId,
  DeckLoop,
  DeckSnapshot,
  EngineSnapshot,
  LocalTrack,
  MicSnapshot,
} from './types'

const MAX_BUFFER_SECONDS = 15 * 60
const MAX_BUFFER_BYTES = 200 * 1024 * 1024

export class LiveAudioEngine {
  readonly context: AudioContext
  readonly streamDestination: MediaStreamAudioDestinationNode
  private masterGain: GainNode
  private limiter: DynamicsCompressorNode
  private masterAnalyser: AnalyserNode
  private musicBus: GainNode
  private duckGain: GainNode
  private cueBus: GainNode
  private crossfadeA: GainNode
  private crossfadeB: GainNode

  private decks: Record<DeckId, Deck>
  onDeckEnded: ((id: DeckId) => void) | null = null
  private crossfader = 0.5
  private masterDb = 0

  private micStream: MediaStream | null = null
  private micSource: MediaStreamAudioSourceNode | null = null
  private micHighPass: BiquadFilterNode | null = null
  private micCompressor: DynamicsCompressorNode | null = null
  private micGain: GainNode | null = null
  private micCueGain: GainNode | null = null
  private micAnalyser: AnalyserNode | null = null
  private micEnabled = false
  private micGainDb = 0
  private talkover = true
  private talkoverTimer: ReturnType<typeof setInterval> | null = null
  private micPermission: MicSnapshot['permission'] = 'unknown'
  private analyserBuffer = new Float32Array(2048)

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })

    this.streamDestination = this.context.createMediaStreamDestination()

    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 1

    this.limiter = this.context.createDynamicsCompressor()
    this.limiter.threshold.value = -1
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.25

    this.masterAnalyser = this.context.createAnalyser()
    this.masterAnalyser.fftSize = 2048

    this.musicBus = this.context.createGain()
    this.duckGain = this.context.createGain()
    this.duckGain.gain.value = 1

    this.cueBus = this.context.createGain()
    this.cueBus.gain.value = 1

    this.crossfadeA = this.context.createGain()
    this.crossfadeB = this.context.createGain()
    this.crossfadeA.gain.value = 1
    this.crossfadeB.gain.value = 0

    this.crossfadeA.connect(this.musicBus)
    this.crossfadeB.connect(this.musicBus)
    this.musicBus.connect(this.duckGain)
    this.duckGain.connect(this.masterGain)
    this.masterGain.connect(this.limiter)
    this.limiter.connect(this.streamDestination)
    this.limiter.connect(this.masterAnalyser)
    this.cueBus.connect(this.context.destination)

    this.decks = {
      A: new Deck({
        id: 'A',
        context: this.context,
        destination: this.crossfadeA,
        cueDestination: this.cueBus,
      }),
      B: new Deck({
        id: 'B',
        context: this.context,
        destination: this.crossfadeB,
        cueDestination: this.cueBus,
      }),
    }
    this.decks.A.onEnded = () => this.onDeckEnded?.('A')
    this.decks.B.onEnded = () => this.onDeckEnded?.('B')

    this.applyCrossfader()
  }

  get stream(): MediaStream {
    return this.streamDestination.stream
  }

  getDeck(id: DeckId): Deck {
    return this.decks[id]
  }

  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  setCrossfader(position: number): void {
    this.crossfader = clamp(position, 0, 1)
    this.applyCrossfader()
  }

  private applyCrossfader(): void {
    const { a, b } = equalPowerGains(this.crossfader)
    const now = this.context.currentTime
    this.crossfadeA.gain.setTargetAtTime(a, now, 0.01)
    this.crossfadeB.gain.setTargetAtTime(b, now, 0.01)
  }

  setMasterDb(db: number): void {
    this.masterDb = clamp(db, -60, 6)
    this.masterGain.gain.setTargetAtTime(dbToGain(this.masterDb), this.context.currentTime, 0.01)
  }

  setDeckGain(id: DeckId, db: number): void {
    this.decks[id].setGain(clamp(db, -60, 6))
  }

  setDeckEq(id: DeckId, band: keyof DeckEq, db: number): void {
    this.decks[id].setEq(band, clamp(db, -18, 18))
  }

  setDeckCue(id: DeckId, enabled: boolean): void {
    this.decks[id].setCue(enabled)
  }

  setDeckLoop(id: DeckId, loop: Partial<DeckLoop>): void {
    this.decks[id].setLoop(loop)
  }

  clearDeckLoop(id: DeckId): void {
    this.decks[id].clearLoop()
  }

  async loadTrack(id: DeckId, track: LocalTrack, file: File): Promise<'buffer' | 'element'> {
    const deck = this.decks[id]
    const size = file.size
    const duration = track.duration

    if (size > MAX_BUFFER_BYTES || (duration != null && duration > MAX_BUFFER_SECONDS)) {
      deck.loadElement(file, track)
      return 'element'
    }

    try {
      const data = await file.arrayBuffer()
      const buffer = await this.context.decodeAudioData(data)
      deck.loadBuffer(buffer, track)
      return 'buffer'
    } catch {
      deck.loadElement(file, track)
      return 'element'
    }
  }

  setDeckBpm(id: DeckId, bpm: number | null, confidence: number): void {
    const deck = this.decks[id]
    deck.bpm = bpm
    deck.bpmConfidence = confidence
  }

  async enableMic(): Promise<boolean> {
    if (this.micEnabled) return true
    if (!navigator.mediaDevices?.getUserMedia) {
      this.micPermission = 'unavailable'
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
        },
      })
      this.micPermission = 'granted'
      this.micStream = stream
      const source = this.context.createMediaStreamSource(stream)
      const highPass = this.context.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 85
      const compressor = this.context.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value = 12
      compressor.ratio.value = 4
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      const gain = this.context.createGain()
      gain.gain.value = dbToGain(this.micGainDb)
      const cue = this.context.createGain()
      cue.gain.value = 0
      const analyser = this.context.createAnalyser()
      analyser.fftSize = 1024

      source.connect(highPass)
      highPass.connect(compressor)
      compressor.connect(gain)
      gain.connect(this.masterGain)
      gain.connect(cue)
      compressor.connect(analyser)
      cue.connect(this.cueBus)

      this.micSource = source
      this.micHighPass = highPass
      this.micCompressor = compressor
      this.micGain = gain
      this.micCueGain = cue
      this.micAnalyser = analyser
      this.micEnabled = true
      this.startTalkover()
      return true
    } catch {
      this.micPermission = 'denied'
      return false
    }
  }

  disableMic(): void {
    this.stopTalkover()
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop()
    }
    this.micSource?.disconnect()
    this.micHighPass?.disconnect()
    this.micCompressor?.disconnect()
    this.micGain?.disconnect()
    this.micCueGain?.disconnect()
    this.micAnalyser?.disconnect()
    this.micStream = null
    this.micSource = null
    this.micHighPass = null
    this.micCompressor = null
    this.micGain = null
    this.micCueGain = null
    this.micAnalyser = null
    this.micEnabled = false
    this.duckGain.gain.setTargetAtTime(1, this.context.currentTime, 0.05)
  }

  setMicGain(db: number): void {
    this.micGainDb = clamp(db, -60, 12)
    this.micGain?.gain.setTargetAtTime(dbToGain(this.micGainDb), this.context.currentTime, 0.01)
  }

  setMicCue(enabled: boolean): void {
    this.micCueGain?.gain.setTargetAtTime(enabled ? 0.35 : 0, this.context.currentTime, 0.01)
  }

  setTalkover(enabled: boolean): void {
    this.talkover = enabled
    if (!enabled) {
      this.duckGain.gain.setTargetAtTime(1, this.context.currentTime, 0.05)
    }
  }

  private startTalkover(): void {
    if (this.talkoverTimer) return
    this.talkoverTimer = setInterval(() => {
      if (!this.talkover || !this.micEnabled || !this.micAnalyser) return
      const data = new Float32Array(this.micAnalyser.fftSize)
      this.micAnalyser.getFloatTimeDomainData(data)
      const rms = computeRms(data)
      const db = gainToDb(rms)
      const target = db > -38 ? 0.28 : 1
      this.duckGain.gain.setTargetAtTime(target, this.context.currentTime, 0.08)
    }, 60)
  }

  private stopTalkover(): void {
    if (this.talkoverTimer) {
      clearInterval(this.talkoverTimer)
      this.talkoverTimer = null
    }
  }

  readMasterLevelDb(): number {
    this.masterAnalyser.getFloatTimeDomainData(this.analyserBuffer)
    return gainToDb(computeRms(this.analyserBuffer))
  }

  readMicLevelDb(): number {
    if (!this.micAnalyser) return -Infinity
    const data = new Float32Array(this.micAnalyser.fftSize)
    this.micAnalyser.getFloatTimeDomainData(data)
    return gainToDb(computeRms(data))
  }

  getSnapshot(): EngineSnapshot {
    const deckSnapshot = (id: DeckId): DeckSnapshot => {
      const deck = this.decks[id]
      const track = deck.snapshotTrack
      return {
        id,
        track,
        playing: deck.isPlaying(),
        position: deck.getPosition(),
        duration: deck.getDuration(),
        gain: deck.getGain(),
        eq: deck.getEq(),
        loop: deck.getLoop(),
        cue: false,
        bpm: deck.bpm,
        bpmConfidence: deck.bpmConfidence,
        mode: deck.getMode(),
      }
    }

    return {
      decks: { A: deckSnapshot('A'), B: deckSnapshot('B') },
      mic: {
        enabled: this.micEnabled,
        gain: this.micGainDb,
        talkover: this.talkover,
        levelDb: this.readMicLevelDb(),
        permission: this.micPermission,
      },
      crossfader: this.crossfader,
      masterDb: this.masterDb,
      masterLevelDb: this.readMasterLevelDb(),
      contextState: this.context.state,
    }
  }

  destroy(): void {
    this.stopTalkover()
    this.disableMic()
    this.decks.A.destroy()
    this.decks.B.destroy()
    this.crossfadeA.disconnect()
    this.crossfadeB.disconnect()
    this.musicBus.disconnect()
    this.duckGain.disconnect()
    this.masterGain.disconnect()
    this.limiter.disconnect()
    this.masterAnalyser.disconnect()
    this.cueBus.disconnect()
    void this.context.close()
  }
}
