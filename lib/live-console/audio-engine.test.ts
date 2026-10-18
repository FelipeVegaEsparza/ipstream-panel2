import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveAudioEngine } from './audio-engine'

class FakeNode {
  connections: FakeNode[] = []
  connect(target: FakeNode) {
    this.connections.push(target)
    return target
  }
  disconnect() {
    this.connections = []
  }
}

class FakeGain extends FakeNode {
  gain = {
    value: 1,
    setTargetAtTime: vi.fn(),
  }
}

class FakeFilter extends FakeNode {
  type = 'peaking'
  frequency = { value: 0 }
  Q = { value: 0 }
  gain = { value: 0, setTargetAtTime: vi.fn() }
}

class FakeCompressor extends FakeNode {
  threshold = { value: 0 }
  knee = { value: 0 }
  ratio = { value: 0 }
  attack = { value: 0 }
  release = { value: 0 }
}

class FakeAnalyser extends FakeNode {
  fftSize = 2048
  getFloatTimeDomainData(buffer: Float32Array) {
    buffer.fill(0)
  }
}

class FakeContext {
  state: AudioContextState = 'running'
  currentTime = 0
  destination = new FakeNode()
  streamDest = { stream: { getAudioTracks: () => [] } }

  createGain() { return new FakeGain() }
  createBiquadFilter() { return new FakeFilter() }
  createDynamicsCompressor() { return new FakeCompressor() }
  createAnalyser() { return new FakeAnalyser() }
  createMediaStreamDestination() { return this.streamDest }
  createBufferSource() {
    return {
      ...new FakeNode(),
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      buffer: null,
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
    }
  }
  createMediaElementSource() { return new FakeNode() }
  createMediaStreamSource() { return new FakeNode() }
  async resume() { this.state = 'running' }
  async close() { this.state = 'closed' }
}

const originalAudioContext = globalThis.AudioContext

afterEach(() => {
  globalThis.AudioContext = originalAudioContext
})

describe('LiveAudioEngine', () => {
  it('envía el programa al MediaStream y el cue a la salida local', () => {
    globalThis.AudioContext = FakeContext as unknown as typeof AudioContext
    const engine = new LiveAudioEngine()
    const context = engine.context as unknown as FakeContext

    expect(engine.stream).toBe(context.streamDest.stream)
    expect(context.destination.connections).toHaveLength(0)
    expect(context.streamDest).toBeDefined()

    // El master se conecta al stream destination; el cue a la salida local.
    const connections = (node: unknown) => (node as FakeNode).connections
    const allNodes = [
      ...connections(engine['crossfadeA']),
      ...connections(engine['crossfadeB']),
      ...connections(engine['musicBus']),
      ...connections(engine['duckGain']),
      ...connections(engine['masterGain']),
      ...connections(engine['limiter']),
    ]
    expect(allNodes).toContain(context.streamDest as unknown as FakeNode)

    const cue = engine['cueBus'] as unknown as FakeNode
    expect(cue.connections).toContain(context.destination)

    const monitor = engine['monitorGain'] as unknown as FakeNode
    expect(monitor.connections).toContain(context.destination)

    expect(engine.getSnapshot().decks.A.mode).toBeNull()
    engine.destroy()
  })
})
