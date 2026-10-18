// =====================================================
// Live Console — Deck de reproducción
// =====================================================
// Modo buffer: loops precisos y scheduling con AudioContext.
// Modo element: fallback para archivos largos (poca memoria).

import { dbToGain } from './audio-math'
import type { DeckEq, DeckId, DeckLoop, LocalTrack } from './types'

export interface DeckOptions {
  id: DeckId
  context: AudioContext
  destination: AudioNode
  cueDestination: AudioNode
}

const DEFAULT_LOOP: DeckLoop = { enabled: false, start: 0, end: 0, quantized: false }
const DEFAULT_EQ: DeckEq = { low: 0, mid: 0, high: 0 }

export class Deck {
  readonly id: DeckId
  private context: AudioContext
  private destination: AudioNode
  private cueDestination: AudioNode

  private inputGain: GainNode
  private eqLow: BiquadFilterNode
  private eqMid: BiquadFilterNode
  private eqHigh: BiquadFilterNode
  private cueGain: GainNode

  private track: LocalTrack | null = null
  private mode: 'buffer' | 'element' | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private element: HTMLAudioElement | null = null
  private elementSource: MediaElementAudioSourceNode | null = null
  private objectUrl: string | null = null

  private startedAt = 0
  private offset = 0
  private playing = false
  private loop: DeckLoop = { ...DEFAULT_LOOP }
  private eq: DeckEq = { ...DEFAULT_EQ }
  private gainDb = 0
  private cue = false

  bpm: number | null = null
  bpmConfidence = 0
  onEnded: (() => void) | null = null

  constructor(options: DeckOptions) {
    this.id = options.id
    this.context = options.context
    this.destination = options.destination
    this.cueDestination = options.cueDestination

    this.inputGain = this.context.createGain()
    this.inputGain.gain.value = 1

    this.eqLow = this.context.createBiquadFilter()
    this.eqLow.type = 'lowshelf'
    this.eqLow.frequency.value = 220

    this.eqMid = this.context.createBiquadFilter()
    this.eqMid.type = 'peaking'
    this.eqMid.frequency.value = 1200
    this.eqMid.Q.value = 0.8

    this.eqHigh = this.context.createBiquadFilter()
    this.eqHigh.type = 'highshelf'
    this.eqHigh.frequency.value = 4500

    this.cueGain = this.context.createGain()
    this.cueGain.gain.value = 0

    this.inputGain.connect(this.eqLow)
    this.eqLow.connect(this.eqMid)
    this.eqMid.connect(this.eqHigh)
    this.eqHigh.connect(this.destination)
    this.eqHigh.connect(this.cueGain)
    this.cueGain.connect(this.cueDestination)
  }

  get snapshotTrack(): LocalTrack | null {
    return this.track
  }

  getMode(): 'buffer' | 'element' | null {
    return this.mode
  }

  getLoop(): DeckLoop {
    return { ...this.loop }
  }

  getEq(): DeckEq {
    return { ...this.eq }
  }

  getGain(): number {
    return this.gainDb
  }

  isPlaying(): boolean {
    return this.playing
  }

  getAnalysisData(): { mono: Float32Array; sampleRate: number } | null {
    if (this.mode !== 'buffer' || !this.buffer) return null
    const length = Math.min(this.buffer.length, Math.floor(this.buffer.sampleRate * 60))
    return {
      mono: this.buffer.getChannelData(0).slice(0, length),
      sampleRate: this.buffer.sampleRate,
    }
  }

  getDuration(): number {
    if (this.mode === 'buffer' && this.buffer) return this.buffer.duration
    if (this.mode === 'element' && this.element) {
      return Number.isFinite(this.element.duration) ? this.element.duration : 0
    }
    return 0
  }

  getPosition(): number {
    if (!this.playing) {
      if (this.mode === 'element' && this.element) return this.element.currentTime || this.offset
      return this.offset
    }
    if (this.mode === 'buffer' && this.source) {
      const elapsed = Math.max(0, this.context.currentTime - this.startedAt)
      const duration = this.getDuration()
      if (this.loop.enabled && this.loop.end > this.loop.start) {
        const loopLength = this.loop.end - this.loop.start
        const position = this.loop.start + (elapsed % loopLength)
        return Math.min(position, duration)
      }
      return Math.min(elapsed, duration)
    }
    if (this.mode === 'element' && this.element) return this.element.currentTime
    return this.offset
  }

  loadBuffer(buffer: AudioBuffer, track: LocalTrack): void {
    this.resetSource()
    this.revokeObjectUrl()
    this.track = track
    this.mode = 'buffer'
    this.buffer = buffer
    this.offset = 0
    this.playing = false
    this.loop = { ...DEFAULT_LOOP }
    this.applyLoopToSource()
  }

  loadElement(file: File, track: LocalTrack): void {
    this.resetSource()
    this.revokeObjectUrl()
    this.track = track
    this.mode = 'element'
    this.buffer = null
    this.offset = 0
    this.playing = false
    this.loop = { ...DEFAULT_LOOP }

    const element = new Audio()
    element.preload = 'metadata'
    element.crossOrigin = 'anonymous'
    this.objectUrl = URL.createObjectURL(file)
    element.src = this.objectUrl
    this.element = element
    this.elementSource = this.context.createMediaElementSource(element)
    this.elementSource.connect(this.inputGain)
    element.addEventListener('ended', () => {
      if (this.loop.enabled) {
        element.currentTime = this.loop.start
        void element.play().catch(() => {})
        return
      }
      this.playing = false
      this.offset = this.getDuration()
      this.onEnded?.()
    })
    element.addEventListener('timeupdate', () => {
      if (!this.loop.enabled || this.loop.end <= this.loop.start) return
      if (element.currentTime >= this.loop.end || element.currentTime < this.loop.start - 0.5) {
        element.currentTime = this.loop.start
      }
    })
  }

  async play(from?: number): Promise<void> {
    if (!this.mode) return

    if (this.mode === 'element' && this.element) {
      if (typeof from === 'number') this.element.currentTime = from
      await this.element.play()
      this.playing = true
      this.applyCueGain()
      return
    }

    if (this.mode !== 'buffer' || !this.buffer || this.source) return

    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.inputGain)
    this.source = source

    let startAt = typeof from === 'number' ? from : this.offset
    if (this.loop.enabled && this.loop.end > this.loop.start) {
      if (startAt < this.loop.start || startAt >= this.loop.end) startAt = this.loop.start
      source.loop = true
      source.loopStart = this.loop.start
      source.loopEnd = this.loop.end
    }

    source.onended = () => {
      if (this.source !== source) return
      this.source = null
      this.playing = false
      if (!this.loop.enabled) {
        this.offset = this.getDuration()
        this.onEnded?.()
      }
    }

    this.startedAt = this.context.currentTime - startAt
    this.offset = startAt
    this.playing = true
    source.start(0, startAt)
    this.applyCueGain()
  }

  pause(): void {
    if (!this.playing) return
    if (this.mode === 'buffer' && this.source) {
      this.offset = this.getPosition()
      this.resetSource()
    } else if (this.mode === 'element' && this.element) {
      this.offset = this.element.currentTime
      this.element.pause()
    }
    this.playing = false
  }

  seek(seconds: number): void {
    const duration = this.getDuration()
    const target = Math.max(0, Math.min(seconds, duration || seconds))
    if (this.playing && this.mode === 'buffer') {
      this.resetSource()
      this.offset = target
      void this.play(target)
    } else if (this.mode === 'element' && this.element) {
      this.element.currentTime = target
      this.offset = target
    } else {
      this.offset = target
    }
  }

  stop(): void {
    this.resetSource()
    if (this.mode === 'element' && this.element) {
      this.element.pause()
      this.element.currentTime = 0
    }
    this.playing = false
    this.offset = 0
  }

  setLoop(loop: Partial<DeckLoop>): void {
    const next: DeckLoop = { ...this.loop, ...loop }
    if (next.end <= next.start) next.enabled = false
    this.loop = next
    if (this.mode === 'buffer' && this.source) {
      this.source.loop = next.enabled
      if (next.enabled) {
        this.source.loopStart = next.start
        this.source.loopEnd = next.end
        const position = this.getPosition()
        if (position < next.start || position >= next.end) {
          this.seek(next.start)
        }
      }
    }
  }

  clearLoop(): void {
    this.setLoop({ enabled: false, start: 0, end: 0, quantized: false })
  }

  setGain(db: number): void {
    this.gainDb = db
    this.inputGain.gain.setTargetAtTime(dbToGain(db), this.context.currentTime, 0.01)
  }

  setEq(band: keyof DeckEq, db: number): void {
    this.eq[band] = db
    const node = band === 'low' ? this.eqLow : band === 'mid' ? this.eqMid : this.eqHigh
    node.gain.setTargetAtTime(db, this.context.currentTime, 0.01)
  }

  setCue(enabled: boolean): void {
    this.cue = enabled
    this.applyCueGain()
  }

  private applyCueGain(): void {
    this.cueGain.gain.setTargetAtTime(this.cue ? 1 : 0, this.context.currentTime, 0.01)
  }

  private applyLoopToSource(): void {
    if (!this.source) return
    this.source.loop = this.loop.enabled
    if (this.loop.enabled) {
      this.source.loopStart = this.loop.start
      this.source.loopEnd = this.loop.end
    }
  }

  private resetSource(): void {
    if (this.source) {
      this.source.onended = null
      try { this.source.stop() } catch {}
      this.source.disconnect()
      this.source = null
    }
  }

  private revokeObjectUrl(): void {
    if (this.element) {
      this.element.pause()
      this.element.removeAttribute('src')
      this.element.load()
      this.element = null
    }
    if (this.elementSource) {
      this.elementSource.disconnect()
      this.elementSource = null
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
  }

  destroy(): void {
    this.stop()
    this.resetSource()
    this.revokeObjectUrl()
    this.inputGain.disconnect()
    this.eqLow.disconnect()
    this.eqMid.disconnect()
    this.eqHigh.disconnect()
    this.cueGain.disconnect()
  }
}
