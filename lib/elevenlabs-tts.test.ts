import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { createHash } from 'crypto'
import { tmpdir } from 'os'
import path from 'path'

let cacheDir = ''

const input = {
  text: 'Son las 19 horas con 12 minutos.',
  apiKey: 'test-key',
  voiceId: 'test-voice',
  model: 'eleven_v4_turbo',
  cacheEnabled: true,
  postProcess: false,
  legacyStyle: 0,
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

  it('reintenta con 128 si el proveedor rechaza 192', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('mp3_44100_192')) {
        return Promise.resolve(new Response('format not allowed', { status: 400 }))
      }
      return Promise.resolve(
        new Response(new Uint8Array([7, 8, 9]), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' },
        })
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeElevenLabs } = await import('./elevenlabs-tts')
    const result = await synthesizeElevenLabs(input)

    expect(Array.from(result.audio)).toEqual([7, 8, 9])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('mp3_44100_192')
    expect(String(fetchMock.mock.calls[1][0])).toContain('mp3_44100_128')
  })

  it('reintenta sin diccionario si el modelo lo rechaza', async () => {
    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'))
      if (body.pronunciation_dictionary_locators) {
        return Promise.resolve(new Response('dictionary unsupported', { status: 400 }))
      }
      return Promise.resolve(
        new Response(new Uint8Array([9, 9, 9]), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' },
        })
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeElevenLabs } = await import('./elevenlabs-tts')
    const result = await synthesizeElevenLabs({
      ...input,
      pronunciationDictionaryId: 'dict-1',
      pronunciationDictionaryVersionId: 'v1',
    })

    expect(Array.from(result.audio)).toEqual([9, 9, 9])
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
  })

  it('expone un filtro de post-proceso con loudness y limitador', async () => {
    const { VOICE_POST_PROCESS_FILTER } = await import('./elevenlabs-tts')
    expect(VOICE_POST_PROCESS_FILTER).toContain('highpass=f=80')
    expect(VOICE_POST_PROCESS_FILTER).toContain('loudnorm')
    expect(VOICE_POST_PROCESS_FILTER).toContain('alimiter')
  })

  it('reutiliza el cache legacy sin llamar a la API', async () => {
    const legacyText = input.text
    const legacyHash = createHash('sha256')
      .update(`${input.model}\n${input.voiceId}\n0\nes\n${legacyText}`)
      .digest('hex')
    const legacyDir = path.join(cacheDir, input.model, input.voiceId)
    await mkdir(legacyDir, { recursive: true })
    await writeFile(path.join(legacyDir, `${legacyHash}.mp3`), Buffer.from([4, 5, 6]))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeElevenLabs } = await import('./elevenlabs-tts')
    const result = await synthesizeElevenLabs(input)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.cached).toBe(true)
    expect(Array.from(result.audio)).toEqual([4, 5, 6])
  })

  it('aplica reemplazos fonéticos solo si no alargan el texto', async () => {
    const { applyPronunciationReplacements } = await import('./elevenlabs-tts')
    expect(applyPronunciationReplacements('AI en vivo')).toBe('IA en vivo')
    expect(applyPronunciationReplacements('Streaming')).toBe('estriming')
    expect(applyPronunciationReplacements('CasterFly')).toBe('CasterFly')
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
