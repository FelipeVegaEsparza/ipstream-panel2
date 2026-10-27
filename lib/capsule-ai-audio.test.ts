import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  mix: vi.fn(),
  probe: vi.fn(),
  consume: vi.fn(),
  access: vi.fn(),
}))

vi.mock('@/lib/elevenlabs-config', () => ({
  getElevenLabsConfig: vi.fn(async () => ({ apiKey: 'test-key' })),
}))
vi.mock('@/lib/ai-music', () => ({
  getAiMusicAccess: mocks.access,
  consumeAiMusicSeconds: mocks.consume,
}))
vi.mock('@/lib/audio-mix', () => ({
  mixMusicAndVoice: mocks.mix,
  probeAudioBufferDuration: mocks.probe,
}))

const { addCapsuleIntro } = await import('./capsule-ai-audio')

describe('addCapsuleIntro', () => {
  it('genera una cama musical y una sola mezcla', async () => {
    mocks.access.mockResolvedValue({ enabled: true, remainingSeconds: 100 })
    mocks.consume.mockResolvedValue(undefined)
    mocks.fetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.probe.mockResolvedValue(8)
    mocks.mix.mockResolvedValue(Buffer.from([7]))

    const result = await addCapsuleIntro('client-1', Buffer.from([9]))

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.consume).toHaveBeenCalledTimes(1)
    expect(mocks.consume).toHaveBeenCalledWith('client-1', 10, 'ai-capsule')
    expect(mocks.mix).toHaveBeenCalledTimes(1)
    expect(result).toEqual(Buffer.from([7]))
    vi.unstubAllGlobals()
  })
})
