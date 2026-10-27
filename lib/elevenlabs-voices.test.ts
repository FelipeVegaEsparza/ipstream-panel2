import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findRadio: vi.fn(),
  findConfig: vi.fn(),
  globalConfig: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    radioStream: { findUnique: mocks.findRadio },
    appConfig: { findFirst: mocks.findConfig },
  },
}))
vi.mock('./elevenlabs-config', () => ({
  getElevenLabsConfig: mocks.globalConfig,
}))

const { getClientVoiceSettings } = await import('./elevenlabs-voices')

describe('getClientVoiceSettings', () => {
  it('hereda el preset global cuando el cliente no tiene uno', async () => {
    mocks.findRadio.mockResolvedValue({ aiVoiceId: null, aiVoiceStyle: 0, aiVoicePreset: null })
    mocks.findConfig.mockResolvedValue({ elevenLabsVoices: null })
    mocks.globalConfig.mockResolvedValue({ voiceId: 'global-voice', qualityPreset: 'stable' })

    const settings = await getClientVoiceSettings('client-1')

    expect(settings.preset).toBe('stable')
    expect(settings.quality.style).toBe(0)
    expect(settings.voiceId).toBe('global-voice')
  })

  it('respeta el preset y el estilo explícitos del cliente', async () => {
    mocks.findRadio.mockResolvedValue({
      aiVoiceId: 'voice-1',
      aiVoiceStyle: 70,
      aiVoicePreset: 'expressive',
    })
    mocks.findConfig.mockResolvedValue({ elevenLabsVoices: JSON.stringify([{ id: 'voice-1', name: 'Voz 1' }]) })
    mocks.globalConfig.mockResolvedValue({ voiceId: 'global-voice', qualityPreset: 'natural' })

    const settings = await getClientVoiceSettings('client-2')

    expect(settings.preset).toBe('expressive')
    expect(settings.quality.style).toBe(0.7)
    expect(settings.name).toBe('Voz 1')
  })
})
