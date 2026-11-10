import { describe, expect, it, vi } from 'vitest'
import { generateNewsCapsuleAudio } from './news-capsules/audio'

const intro = 'Intro de la radio.'
const items = ['Primera noticia.', 'Segunda noticia.']
const closing = 'Cierre de la radio.'

function deps(overrides: Record<string, unknown> = {}) {
  return {
    synthesize: vi.fn(async () => ({
      audio: Buffer.from('tts'),
      contentType: 'audio/mpeg',
      provider: 'fish' as const,
      cached: false,
    })),
    concat: vi.fn(async () => Buffer.from('voice')),
    probe: vi.fn(async () => 12),
    mix: vi.fn(async () => Buffer.from('mixed')),
    ...overrides,
  }
}

describe('generateNewsCapsuleAudio', () => {
  it('mezcla música de fondo cuando existe', async () => {
    const d = deps()
    const result = await generateNewsCapsuleAudio(
      { clientId: 'c1', intro, items, closing, music: Buffer.from('music') },
      d as any
    )
    expect(d.mix).toHaveBeenCalledWith(expect.objectContaining({ music: Buffer.from('music') }))
    expect(result.audio).toEqual(Buffer.from('mixed'))
    expect(result.ttsCharacters).toBe(intro.length + items.join('').length + closing.length)
  })

  it('genera solo locución sin música', async () => {
    const d = deps()
    const result = await generateNewsCapsuleAudio({ clientId: 'c1', intro, items, closing, music: null }, d as any)
    expect(d.mix).not.toHaveBeenCalled()
    expect(result.audio).toEqual(Buffer.from('voice'))
  })

  it('rechaza cápsulas mayores a 120 segundos', async () => {
    const d = deps({ probe: vi.fn(async () => 130) })
    await expect(
      generateNewsCapsuleAudio({ clientId: 'c1', intro, items, closing, music: null }, d as any)
    ).rejects.toThrow(/120/)
  })
})
