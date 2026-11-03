import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  callDeepSeekJson: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiReview: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}))

vi.mock('@/lib/deepseek', () => ({
  callDeepSeekJson: mocks.callDeepSeekJson,
}))

vi.mock('@/lib/premium-tts', () => ({ synthesizePremiumTts: vi.fn() }))
vi.mock('@/lib/audio-mix', () => ({ probeAudioBufferDuration: vi.fn() }))

import {
  getOrCreateReview,
  listClientReviews,
  regenerateReview,
  setReviewActive,
} from './ai-reviews'

const REVIEW_TEXT =
  'Un dato: el tema no tiene solo de guitarra y dice todo en la primera estrofa, sin guardarse nada para el final.'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rev-1',
    clientId: 'c1',
    kind: 'track',
    artist: 'Los Prisioneros',
    title: 'El baile de los que sobran',
    artistKey: 'los prisioneros',
    titleKey: 'el baile de los que sobran',
    style: 'dato-curioso',
    text: REVIEW_TEXT,
    active: true,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('banco de reseñas', () => {
  it('reutiliza una reseña existente sin llamar a DeepSeek', async () => {
    mocks.findUnique.mockResolvedValue(row())

    const result = await getOrCreateReview({
      clientId: 'c1',
      artist: 'Los Prisioneros',
      title: 'El baile de los que sobran',
      style: 'dato-curioso',
      hasIntro: true,
    })

    expect(result?.id).toBe('rev-1')
    expect(mocks.callDeepSeekJson).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('genera y guarda la reseña cuando no existe', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.callDeepSeekJson.mockResolvedValue({ texto: REVIEW_TEXT, tipo: 'descriptivo', seguro: false })
    mocks.create.mockResolvedValue(row())

    const result = await getOrCreateReview({
      clientId: 'c1',
      artist: 'Los Prisioneros',
      title: 'El baile de los que sobran',
      style: 'dato-curioso',
      hasIntro: true,
    })

    expect(mocks.callDeepSeekJson).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'c1',
        kind: 'track',
        artistKey: 'los prisioneros',
        titleKey: 'el baile de los que sobran',
        style: 'dato-curioso',
        text: REVIEW_TEXT,
      }),
    })
    expect(result?.id).toBe('rev-1')
  })

  it('no emite una reseña desactivada', async () => {
    mocks.findUnique.mockResolvedValue(row({ active: false }))

    const result = await getOrCreateReview({
      clientId: 'c1',
      artist: 'Los Prisioneros',
      title: 'El baile de los que sobran',
      style: 'dato-curioso',
      hasIntro: true,
    })

    expect(result).toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('devuelve null si faltan artista o título', async () => {
    await expect(
      getOrCreateReview({ clientId: 'c1', artist: '', title: 'Tema', style: 'dato-curioso', hasIntro: true })
    ).resolves.toBeNull()
    await expect(
      getOrCreateReview({ clientId: 'c1', artist: 'Artista', title: '', style: 'dato-curioso', hasIntro: true })
    ).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it('lista las reseñas del cliente', async () => {
    mocks.findMany.mockResolvedValue([row()])

    await expect(listClientReviews('c1')).resolves.toHaveLength(1)
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'c1' } })
    )
  })

  it('no deja desactivar reseñas de otro cliente', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })
    await expect(setReviewActive('otro', 'rev-1', false)).resolves.toBe(false)
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'rev-1', clientId: 'otro' },
      data: { active: false },
    })
  })

  it('regenera el texto de una reseña existente', async () => {
    mocks.findFirst.mockResolvedValue(row())
    mocks.callDeepSeekJson.mockResolvedValue({
      texto: 'Un dato nuevo sobre el mismo tema, con otra descripción sonora del arreglo.',
      tipo: 'descriptivo',
      seguro: false,
    })
    mocks.update.mockResolvedValue(row({ text: 'Un dato nuevo sobre el mismo tema, con otra descripción sonora del arreglo.' }))

    const result = await regenerateReview('c1', 'rev-1')

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      data: expect.objectContaining({ active: true }),
    })
    expect(result?.text).not.toBe(REVIEW_TEXT)
  })

  it('no regenera reseñas de otro cliente', async () => {
    mocks.findFirst.mockResolvedValue(null)
    await expect(regenerateReview('otro', 'rev-1')).resolves.toBeNull()
    expect(mocks.callDeepSeekJson).not.toHaveBeenCalled()
  })
})
