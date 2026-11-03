import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  aiReview: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  radioStream: {
    findUnique: vi.fn(),
  },
  callDeepSeekJson: vi.fn(),
  isDeepSeekConfigured: vi.fn(),
  synthesizePremiumTts: vi.fn(),
  hasConfiguredPremiumTts: vi.fn(),
  probeAudioBufferDuration: vi.fn(),
  requireStreamingClient: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiReview: mocks.aiReview,
    radioStream: mocks.radioStream,
  },
}))

vi.mock('@/lib/deepseek', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./deepseek')>()
  return {
    ...actual,
    callDeepSeekJson: mocks.callDeepSeekJson,
    isDeepSeekConfigured: mocks.isDeepSeekConfigured,
  }
})

vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesizePremiumTts,
  hasConfiguredPremiumTts: mocks.hasConfiguredPremiumTts,
}))

vi.mock('@/lib/audio-mix', () => ({
  probeAudioBufferDuration: mocks.probeAudioBufferDuration,
}))

vi.mock('@/lib/streaming-auth', () => {
  class StreamingAuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  }
  return { StreamingAuthError, requireStreamingClient: mocks.requireStreamingClient }
})

import { GET as listReviews } from '@/app/api/dashboard/streaming/ai/reviews/route'
import { PATCH as patchReview } from '@/app/api/dashboard/streaming/ai/reviews/[id]/route'
import { POST as regenerateReviewRoute } from '@/app/api/dashboard/streaming/ai/reviews/[id]/regenerate/route'
import { POST as lookupReview } from '@/app/api/dashboard/streaming/ai/reviews/lookup/route'

const REVIEW_TEXT =
  'Un dato: el tema no tiene solo de guitarra y dice todo en la primera estrofa, sin guardarse nada para el final.'

function jsonRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/dashboard/streaming/ai/reviews', {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rev-1',
    clientId: 'client-a',
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
  mocks.requireStreamingClient.mockResolvedValue({ clientId: 'client-a', hasRadioStream: true })
  mocks.radioStream.findUnique.mockResolvedValue({
    aiReviewEveryTracks: 5,
    aiReviewStyle: 'dato-curioso',
    aiReviewAdminEnabled: true,
  })
  mocks.isDeepSeekConfigured.mockReturnValue(true)
  mocks.hasConfiguredPremiumTts.mockResolvedValue(true)
})

describe('listado y desactivación de reseñas', () => {
  it('lista solo las reseñas del cliente efectivo', async () => {
    mocks.aiReview.findMany.mockResolvedValue([row()])

    const response = await listReviews()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.aiReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-a' } })
    )
    expect(data.reviews).toHaveLength(1)
    expect(data.reviews[0]).toMatchObject({ id: 'rev-1', artist: 'Los Prisioneros' })
  })

  it('desactiva una reseña propia', async () => {
    mocks.aiReview.updateMany.mockResolvedValue({ count: 1 })

    const response = await patchReview(
      jsonRequest({ active: false }),
      { params: { id: 'rev-1' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.aiReview.updateMany).toHaveBeenCalledWith({
      where: { id: 'rev-1', clientId: 'client-a' },
      data: { active: false },
    })
  })

  it('no deja tocar una reseña de otro cliente', async () => {
    mocks.aiReview.updateMany.mockResolvedValue({ count: 0 })

    const response = await patchReview(
      jsonRequest({ active: false }),
      { params: { id: 'rev-ajena' } }
    )

    expect(response.status).toBe(404)
  })

  it('rechaza un estado inválido', async () => {
    const response = await patchReview(
      jsonRequest({ active: 'no' }),
      { params: { id: 'rev-1' } }
    )

    expect(response.status).toBe(400)
    expect(mocks.aiReview.updateMany).not.toHaveBeenCalled()
  })
})

describe('regeneración de reseñas', () => {
  it('reemplaza el texto con una respuesta nueva de DeepSeek', async () => {
    mocks.aiReview.findFirst.mockResolvedValue(row())
    mocks.callDeepSeekJson.mockResolvedValue({
      texto: 'Un dato nuevo sobre el mismo tema, con otra descripción sonora del arreglo.',
      tipo: 'descriptivo',
      seguro: false,
    })
    mocks.aiReview.update.mockResolvedValue(
      row({ text: 'Un dato nuevo sobre el mismo tema, con otra descripción sonora del arreglo.' })
    )

    const response = await regenerateReviewRoute(
      jsonRequest(),
      { params: { id: 'rev-1' } }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.review.text).not.toBe(REVIEW_TEXT)
    expect(mocks.aiReview.update).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      data: expect.objectContaining({ active: true }),
    })
  })

  it('no regenera si el admin apagó las reseñas', async () => {
    mocks.radioStream.findUnique.mockResolvedValue({
      aiReviewEveryTracks: 5,
      aiReviewStyle: 'dato-curioso',
      aiReviewAdminEnabled: false,
    })

    const response = await regenerateReviewRoute(
      jsonRequest(),
      { params: { id: 'rev-1' } }
    )

    expect(response.status).toBe(403)
    expect(mocks.callDeepSeekJson).not.toHaveBeenCalled()
  })
})

describe('lookup de reseñas para la consola', () => {
  it('devuelve la reseña existente sin llamar a DeepSeek', async () => {
    mocks.aiReview.findUnique.mockResolvedValue(row())

    const response = await lookupReview(
      jsonRequest({ artist: 'Los Prisioneros', title: 'El baile de los que sobran' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({ available: true, review: { id: 'rev-1', text: REVIEW_TEXT } })
    expect(mocks.callDeepSeekJson).not.toHaveBeenCalled()
  })

  it('no emite una reseña desactivada individualmente', async () => {
    mocks.aiReview.findUnique.mockResolvedValue(row({ active: false }))

    const response = await lookupReview(
      jsonRequest({ artist: 'Los Prisioneros', title: 'El baile de los que sobran' })
    )

    expect(await response.json()).toMatchObject({ available: false, reason: 'review_disabled' })
    expect(mocks.callDeepSeekJson).not.toHaveBeenCalled()
  })

  it('genera y guarda la reseña si no existe en el banco', async () => {
    mocks.aiReview.findUnique
      .mockResolvedValueOnce(null) // lookup directo
      .mockResolvedValueOnce(null) // búsqueda interna del store
    mocks.callDeepSeekJson.mockResolvedValue({
      texto: REVIEW_TEXT,
      tipo: 'descriptivo',
      seguro: false,
    })
    mocks.aiReview.create.mockResolvedValue(row())

    const response = await lookupReview(
      jsonRequest({ artist: 'Los Prisioneros', title: 'El baile de los que sobran' })
    )
    const data = await response.json()

    expect(data).toMatchObject({ available: true, review: { id: 'rev-1' } })
    expect(mocks.callDeepSeekJson).toHaveBeenCalledTimes(1)
    expect(mocks.aiReview.create).toHaveBeenCalled()
  })

  it('no emite nada si falta artista o título', async () => {
    const response = await lookupReview(jsonRequest({ artist: '', title: 'Tema' }))

    expect(await response.json()).toMatchObject({ available: false, reason: 'missing_metadata' })
    expect(mocks.aiReview.findUnique).not.toHaveBeenCalled()
  })

  it('no emite nada si la frecuencia está en 0', async () => {
    mocks.radioStream.findUnique.mockResolvedValue({
      aiReviewEveryTracks: 0,
      aiReviewStyle: 'dato-curioso',
      aiReviewAdminEnabled: true,
    })

    const response = await lookupReview(
      jsonRequest({ artist: 'Artista', title: 'Tema' })
    )

    expect(await response.json()).toMatchObject({ available: false, reason: 'reviews_disabled' })
  })
})
