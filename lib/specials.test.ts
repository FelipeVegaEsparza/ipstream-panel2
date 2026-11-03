import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  playlist: { findFirst: vi.fn() },
  radioSpecial: { findMany: vi.fn() },
  client: { findUnique: vi.fn() },
  callDeepSeekJson: vi.fn(),
  synthesizePremiumTts: vi.fn(),
  probeAudioBufferDuration: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    playlist: mocks.playlist,
    radioSpecial: mocks.radioSpecial,
    client: mocks.client,
  },
}))

vi.mock('@/lib/deepseek', () => ({ callDeepSeekJson: mocks.callDeepSeekJson }))
vi.mock('@/lib/premium-tts', () => ({ synthesizePremiumTts: mocks.synthesizePremiumTts }))
vi.mock('@/lib/audio-mix', () => ({ probeAudioBufferDuration: mocks.probeAudioBufferDuration }))

import {
  MAX_SPECIAL_SECONDS,
  clampSpecialText,
  ensureStationPrefix,
  findSpecialCollision,
  generateSpecialText,
  insertionPositions,
  isDateString,
  synthesizeSpecialSpeech,
} from './specials'

const audio = { audio: Buffer.from('mp3'), contentType: 'audio/mpeg', provider: 'fish' as const, cached: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('texto de especiales', () => {
  it('siempre antepone el nombre de la radio', () => {
    expect(ensureStationPrefix('Radio CasterFly', 'Bienvenidos al especial.'))
      .toBe('Radio CasterFly. Bienvenidos al especial.')
    expect(ensureStationPrefix('Radio CasterFly', 'radio casterfly. Bienvenidos.'))
      .toBe('radio casterfly. Bienvenidos.')
    expect(ensureStationPrefix('', 'Hola.')).toBe('La radio. Hola.')
  })

  it('recorta en el último punto útil', () => {
    const text = 'Primera frase del especial. Segunda frase que se pasa del límite permitido.'
    expect(clampSpecialText(text, 30)).toBe('Primera frase del especial.')
  })

  it('valida fechas YYYY-MM-DD', () => {
    expect(isDateString('2026-11-03')).toBe(true)
    expect(isDateString('2026-13-01')).toBe(false)
    expect(isDateString('03-11-2026')).toBe(false)
  })

  it('redacta con IA y garantiza el nombre de la radio', async () => {
    mocks.callDeepSeekJson.mockResolvedValue({
      texto: 'Un recorrido por los mejores temas de la banda.',
    })
    const result = await generateSpecialText({
      station: 'Radio CasterFly',
      name: 'Especial de Soda Stereo',
      artist: 'Soda Stereo',
      description: 'Repaso de sus canciones más conocidas.',
      part: 'intro',
    })
    expect(result?.startsWith('Radio CasterFly.')).toBe(true)
    expect(mocks.callDeepSeekJson).toHaveBeenCalledTimes(1)
  })
})

describe('audio de especiales', () => {
  it('usa el audio tal cual si entra en 20 segundos', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValue(14)

    const result = await synthesizeSpecialSpeech({
      clientId: 'c1',
      station: 'Radio',
      text: 'Radio. Bienvenidos al especial.',
      part: 'intro',
    })

    expect(result?.seconds).toBe(14)
    expect(mocks.synthesizePremiumTts).toHaveBeenCalledTimes(1)
    expect(MAX_SPECIAL_SECONDS).toBe(20)
  })

  it('recorta y reintenta si se pasa del tope', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValueOnce(28).mockResolvedValueOnce(18)

    const result = await synthesizeSpecialSpeech({
      clientId: 'c1',
      station: 'Radio',
      text: 'Radio. Primera frase del especial que ocupa bastante. Segunda frase que también suma caracteres.',
      part: 'closing',
    })

    expect(mocks.synthesizePremiumTts).toHaveBeenCalledTimes(2)
    expect(result?.seconds).toBe(18)
  })

  it('descarta el audio si el reintento sigue excedido', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValue(30)

    const result = await synthesizeSpecialSpeech({
      clientId: 'c1',
      station: 'Radio',
      text: 'Radio. Primera frase del especial que ocupa bastante. Segunda frase que también suma caracteres.',
      part: 'intro',
    })

    expect(result).toBeNull()
  })
})

describe('colisiones de frecuencia', () => {
  it('calcula posiciones dentro de una vuelta de la playlist', () => {
    expect(insertionPositions(5, 17)).toEqual([5, 10, 15])
    expect(insertionPositions(10, 7)).toEqual([])
  })

  it('detecta un choque con otro especial activo', async () => {
    mocks.playlist.findFirst.mockResolvedValue({ _count: { entries: 20 } })
    mocks.radioSpecial.findMany.mockResolvedValue([
      { id: 'sp-2', name: 'Otro especial', everyTracks: 10, startDate: null, endDate: null },
    ])

    const conflicts = await findSpecialCollision({
      clientId: 'c1',
      everyTracks: 5,
      excludeId: 'sp-1',
    })

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({ id: 'sp-2', position: 10 })
  })

  it('no marca choque si las fechas no se cruzan', async () => {
    mocks.playlist.findFirst.mockResolvedValue({ _count: { entries: 20 } })
    mocks.radioSpecial.findMany.mockResolvedValue([
      {
        id: 'sp-2',
        name: 'Otro especial',
        everyTracks: 10,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
    ])

    const conflicts = await findSpecialCollision({
      clientId: 'c1',
      everyTracks: 5,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    })

    expect(conflicts).toHaveLength(0)
  })
})
