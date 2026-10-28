import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  synthesize: vi.fn(),
  mix: vi.fn(),
  clientFind: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { client: { findUnique: mocks.clientFind } },
}))
vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesize,
}))
vi.mock('@/lib/audio-mix', () => ({
  mixMusicAndVoice: mocks.mix,
}))

const { generateJingle } = await import('./jingle-ai')

describe('generateJingle', () => {
  it('usa la música provista y hace una sola llamada de TTS', async () => {
    mocks.clientFind.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio Test' },
    })
    mocks.synthesize.mockResolvedValue({
      audio: Buffer.from([4]),
      contentType: 'audio/mpeg',
      provider: 'fish',
      cached: false,
    })
    mocks.mix.mockResolvedValue(Buffer.from([5]))

    const result = await generateJingle({
      clientId: 'client-1',
      duration: 10,
      tagline: 'Hola {{radio}}',
      music: Buffer.from([6]),
    })

    expect(mocks.synthesize).toHaveBeenCalledTimes(1)
    expect(mocks.mix).toHaveBeenCalledTimes(1)
    expect(mocks.mix.mock.calls[0][0]).toMatchObject({
      music: Buffer.from([6]),
      duration: 10,
      loopMusic: true,
    })
    expect(result.audio).toEqual(Buffer.from([5]))
    expect(result.ttsCharacters).toBe('Hola Radio Test'.length)
  })
})
