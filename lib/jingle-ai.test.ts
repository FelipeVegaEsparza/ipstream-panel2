import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  synthesize: vi.fn(),
  mix: vi.fn(),
  compose: vi.fn(),
  beats: vi.fn(),
  split: vi.fn(),
  clientFind: vi.fn(),
  direction: vi.fn(() => '[voz de prueba]'),
  fx: vi.fn(() => ({
    style: 'modern',
    intensity: 70,
    voiceFx: true,
    riserSeconds: 0.85,
    voiceLeadSeconds: 0.15,
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { client: { findUnique: mocks.clientFind } },
}))
vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesize,
}))
vi.mock('@/lib/jingle-fx', () => ({
  mixJingle: mocks.mix,
  resolveJingleDirection: mocks.direction,
  resolveJingleFx: mocks.fx,
}))
vi.mock('@/lib/jingle-voice', () => ({
  composeJingleVoice: mocks.compose,
}))
vi.mock('@/lib/jingle-script', () => ({
  splitJingleScript: mocks.split,
}))
vi.mock('@/lib/jingle-beats', () => ({
  analyzeMusicBeats: mocks.beats,
  alignVoiceToBeat: () => 1.5,
}))
vi.mock('@/lib/audio-mix', () => ({
  probeAudioBufferDuration: async () => 4,
}))

const { generateJingle } = await import('./jingle-ai')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateJingle', () => {
  it('usa la música provista y hace una sola llamada de TTS', async () => {
    mocks.clientFind.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio Test' },
    })
    mocks.split.mockReturnValue(['Hola Radio Test'])
    mocks.synthesize.mockResolvedValue({
      audio: Buffer.from([4]),
      contentType: 'audio/mpeg',
      provider: 'fish',
      cached: false,
    })
    mocks.compose.mockResolvedValue({ audio: Buffer.from([7]), duration: 4 })
    mocks.beats.mockResolvedValue({ beatSeconds: 0.5, startSeconds: 0.2, confidence: 0.4 })
    mocks.mix.mockResolvedValue({
      audio: Buffer.from([5]),
      duration: 11.4,
      style: 'modern',
    })

    const result = await generateJingle({
      clientId: 'client-1',
      duration: 10,
      tagline: 'Hola {{radio}}',
      music: Buffer.from([6]),
      style: 'modern',
      intensity: 70,
    })

    expect(mocks.synthesize).toHaveBeenCalledTimes(1)
    expect(mocks.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Hola Radio Test', direction: '[voz de prueba]' })
    )
    expect(mocks.split).not.toHaveBeenCalled()
    expect(mocks.compose).not.toHaveBeenCalled()
    expect(mocks.mix).toHaveBeenCalledTimes(1)
    expect(mocks.mix.mock.calls[0][0]).toMatchObject({
      music: Buffer.from([6]),
      requestedDuration: 10,
      style: 'modern',
      intensity: 70,
      musicStartSeconds: 0.2,
    })
    expect(result.audio).toEqual(Buffer.from([5]))
    expect(result.duration).toBe(11.4)
    expect(result.style).toBe('modern')
    expect(result.ttsCharacters).toBe('Hola Radio Test'.length)
  })

  it('compone varias frases y pide una locución por frase', async () => {
    mocks.clientFind.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio Test' },
    })
    mocks.split.mockReturnValue(['Hola Radio Test.', 'La mejor música.'])
    mocks.synthesize.mockResolvedValue({
      audio: Buffer.from([4]),
      contentType: 'audio/mpeg',
      provider: 'fish',
      cached: true,
    })
    mocks.compose.mockResolvedValue({ audio: Buffer.from([8]), duration: 9 })
    mocks.beats.mockResolvedValue(null)
    mocks.mix.mockResolvedValue({
      audio: Buffer.from([5]),
      duration: 12,
      style: 'modern',
    })

    const result = await generateJingle({
      clientId: 'client-1',
      duration: 10,
      tagline: 'Hola {{radio}}. La mejor música.',
      music: Buffer.from([6]),
      style: 'modern',
      overrides: { transitionSfx: 'whoosh' },
    })

    expect(mocks.split).toHaveBeenCalledTimes(1)
    expect(mocks.synthesize).toHaveBeenCalledTimes(2)
    expect(mocks.compose).toHaveBeenCalledTimes(1)
    expect(mocks.compose.mock.calls[0][0]).toMatchObject({ style: 'modern' })
    expect(mocks.mix.mock.calls[0][0]).toMatchObject({
      voice: Buffer.from([8]),
      requestedDuration: 10,
      musicStartSeconds: 0,
    })
    expect(mocks.mix.mock.calls[0][0].voiceStartSeconds).toBeUndefined()
    expect(result.ttsCached).toBe(true)
    expect(result.ttsCharacters).toBe(
      'Hola Radio Test.'.length + 'La mejor música.'.length
    )
  })
})
