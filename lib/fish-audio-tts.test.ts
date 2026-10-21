import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

let cacheDir = ''

const input = {
  text: 'Son las 19 horas con 12 minutos.',
  apiKey: 'fish-test-key',
  model: 's2.1-pro-free',
  referenceId: 'voice-ref-1',
  cacheEnabled: true,
}

beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), 'ipstream-fish-tts-'))
  vi.stubEnv('TTS_CACHE_DIR', cacheDir)
  vi.resetModules()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  await rm(cacheDir, { recursive: true, force: true })
})

describe('synthesizeFishAudio', () => {
  it('envía modelo/reference y reutiliza el audio cacheado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([0x49, 0x44, 0x33]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeFishAudio } = await import('./fish-audio-tts')
    const first = await synthesizeFishAudio(input)
    const second = await synthesizeFishAudio(input)

    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.fish.audio/v1/tts')
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer fish-test-key',
      model: 's2.1-pro-free',
    })
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      text: input.text,
      reference_id: 'voice-ref-1',
      format: 'mp3',
    })
  })

  it('permite omitir reference_id para usar la voz predeterminada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { synthesizeFishAudio } = await import('./fish-audio-tts')
    await synthesizeFishAudio({ ...input, referenceId: '' })
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(body.reference_id).toBeUndefined()
  })
})
