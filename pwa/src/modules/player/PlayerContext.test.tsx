import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

class MockAudio {
  static instances: MockAudio[] = []
  static pauseCalls = 0
  static probeCapable = true

  src = ''
  preload = ''
  crossOrigin: string | null = null
  paused = true
  private listeners: Record<string, Array<() => void>> = {}

  constructor() {
    MockAudio.instances.push(this)
  }

  addEventListener(type: string, cb: () => void) {
    ;(this.listeners[type] ??= []).push(cb)
  }

  removeEventListener(type: string, cb: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== cb)
  }

  private emit(type: string) {
    for (const cb of this.listeners[type] ?? []) cb()
  }

  load() {
    queueMicrotask(() => this.emit(MockAudio.probeCapable ? 'loadedmetadata' : 'error'))
  }

  play() {
    this.paused = false
    this.emit('play')
    return Promise.resolve()
  }

  pause() {
    MockAudio.pauseCalls += 1
    this.paused = true
    this.emit('pause')
  }

  removeAttribute() {
    this.src = ''
  }
}

type PlayerModule = typeof import('./PlayerContext')
let mod: PlayerModule
let playerRef: ReturnType<PlayerModule['usePlayer']> | null = null

function Access() {
  playerRef = mod.usePlayer()
  return null
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(async () => {
  vi.resetModules()
  MockAudio.instances = []
  MockAudio.pauseCalls = 0
  MockAudio.probeCapable = true
  vi.stubGlobal('Audio', MockAudio)
  playerRef = null
  mod = await import('./PlayerContext')
})

describe('PlayerContext', () => {
  it('carga la nueva streamUrl cuando cambia en caliente', async () => {
    render(
      <mod.PlayerProvider>
        <Access />
      </mod.PlayerProvider>
    )
    const audio = MockAudio.instances[0]!

    act(() => playerRef!.setStreamUrl('https://x/A'))
    await flush()
    act(() => playerRef!.play())
    expect(audio.src).toBe('https://x/A')

    act(() => playerRef!.setStreamUrl('https://x/B'))
    await flush()
    expect(audio.src).toBe('https://x/B')
  })

  it('no reinicia la fuente si el sondeo CORS concluye en el mismo modo', async () => {
    MockAudio.probeCapable = false
    render(
      <mod.PlayerProvider>
        <Access />
      </mod.PlayerProvider>
    )

    act(() => playerRef!.setStreamUrl('https://x/A'))
    act(() => playerRef!.play())
    await flush()

    expect(MockAudio.pauseCalls).toBe(0)
  })
})
