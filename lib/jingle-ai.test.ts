import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  synthesize: vi.fn(),
  mix: vi.fn(),
  clientFind: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { client: { findUnique: mocks.clientFind } },
}))
vi.mock('@/lib/elevenlabs-config', () => ({
  getElevenLabsConfig: vi.fn(async () => ({ apiKey: 'test-key' })),
}))
vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesize,
}))
vi.mock('@/lib/audio-mix', () => ({
  mixMusicAndVoice: mocks.mix,
}))

const { generateJingle } = await import('./jingle-ai')

describe('generateJingle', () => {
  it('hace una sola llamada de música y una sola de TTS', async () => {
    mocks.clientFind.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio Test' },
    })
    mocks.fetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.synthesize.mockResolvedValue({
      audio: Buffer.from([4]),
      contentType: 'audio/mpeg',
      provider: 'elevenlabs',
      cached: false,
    })
    mocks.mix.mockResolvedValue(Buffer.from([5]))

    const result = await generateJingle({
      clientId: 'client-1',
      prompt: 'pop',
      duration: 10,
      tagline: 'Hola {{radio}}',
    })

    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.synthesize).toHaveBeenCalledTimes(1)
    expect(mocks.mix).toHaveBeenCalledTimes(1)
    expect(result.audio).toEqual(Buffer.from([5]))
    expect(result.ttsCharacters).toBe('Hola Radio Test'.length)
    vi.unstubAllGlobals()
  })
})
