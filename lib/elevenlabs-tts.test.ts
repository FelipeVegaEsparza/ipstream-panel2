import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

let cacheDir = ''

const input = {
  text: 'Son las 19 horas con 12 minutos.',
  apiKey: 'test-key',
  voiceId: 'test-voice',
  model: 'eleven_v4_turbo',
  cacheEnabled: true,
}

beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), 'ipstream-tts-cache-'))
  vi.stubEnv('TTS_CACHE_DIR', cacheDir)
  vi.resetModules()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  await rm(cacheDir, { recursive: true, force: true })
})

describe('synthesizeElevenLabs', () => {
  it('genera una vez y reutiliza el audio cacheado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeElevenLabs } = await import('./elevenlabs-tts')
    const first = await synthesizeElevenLabs(input)
    const second = await synthesizeElevenLabs(input)

    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(Array.from(second.audio)).toEqual([0x49, 0x44, 0x33, 0x04])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('vuelve a llamar a la API si el caché está desactivado', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' },
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeElevenLabs } = await import('./elevenlabs-tts')
    await synthesizeElevenLabs({ ...input, cacheEnabled: false })
    await synthesizeElevenLabs({ ...input, cacheEnabled: false })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
