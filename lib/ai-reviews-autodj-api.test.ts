import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  playlist: { findFirst: vi.fn() },
  client: { findUnique: vi.fn() },
  radioStream: { update: vi.fn() },
  getAiLiveAccess: vi.fn(),
  consumeAiCharacters: vi.fn(),
  synthesizePremiumTts: vi.fn(),
  hasConfiguredPremiumTts: vi.fn(),
  getReviewRecord: vi.fn(),
  getArtistReviewRecord: vi.fn(),
  getOrCreateReview: vi.fn(),
  getOrCreateArtistReview: vi.fn(),
  synthesizeReviewWithLimit: vi.fn(),
  listJingles: vi.fn(),
  deleteJingle: vi.fn(),
  updateJingleConfig: vi.fn(),
  clearAiIntros: vi.fn(),
  clearAiReviews: vi.fn(),
  uploadAiIntro: vi.fn(),
  uploadAiReview: vi.fn(),
  restart: vi.fn(),
  requireStreamingClient: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    playlist: mocks.playlist,
    client: mocks.client,
    radioStream: mocks.radioStream,
  },
}))

vi.mock('@/lib/ai-live', () => ({
  getAiLiveAccess: mocks.getAiLiveAccess,
  consumeAiCharacters: mocks.consumeAiCharacters,
}))

vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesizePremiumTts,
  hasConfiguredPremiumTts: mocks.hasConfiguredPremiumTts,
}))

vi.mock('@/lib/ai-reviews', () => ({
  DEFAULT_REVIEW_STYLE: 'dato-curioso',
  isReviewStyle: (value: unknown) =>
    ['dato-curioso', 'detras-de-la-cancion', 'contexto-historico', 'biografia'].includes(String(value)),
  buildReviewSpeech: (station: string, text: string) => `${station}. ${text}`,
  buildStationBreak: () => 'Seguimos con más música.',
  isUsableArtist: (value: unknown) => Boolean(String(value || '').trim().length > 1),
  isUsableTrackMetadata: (artist: unknown, title: unknown) =>
    Boolean(String(artist || '').trim() && String(title || '').trim()),
  getReviewRecord: mocks.getReviewRecord,
  getArtistReviewRecord: mocks.getArtistReviewRecord,
  getOrCreateReview: mocks.getOrCreateReview,
  getOrCreateArtistReview: mocks.getOrCreateArtistReview,
  synthesizeReviewWithLimit: mocks.synthesizeReviewWithLimit,
}))

vi.mock('@/lib/streaming-client', () => {
  class StreamingAgentError extends Error {}
  return {
    StreamingAgentError,
    streamingClient: {
      listJingles: mocks.listJingles,
      deleteJingle: mocks.deleteJingle,
      updateJingleConfig: mocks.updateJingleConfig,
      clearAiIntros: mocks.clearAiIntros,
      clearAiReviews: mocks.clearAiReviews,
      uploadAiIntro: mocks.uploadAiIntro,
      uploadAiReview: mocks.uploadAiReview,
      restart: mocks.restart,
    },
  }
})

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

import { POST as applyAutoDj } from '@/app/api/dashboard/streaming/ai/autodj/route'

function jsonRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/dashboard/streaming/ai/autodj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function entries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    track: {
      id: `t${i}`,
      title: `Tema ${i}`,
      artist: `Artista ${i}`,
      fileName: `tema-${i}.mp3`,
    },
  }))
}

function reviewFor(index: number) {
  return {
    id: `rev-${index}`,
    clientId: 'client-a',
    kind: 'track',
    artist: `Artista ${index}`,
    title: `Tema ${index}`,
    artistKey: `artista ${index}`,
    titleKey: `tema ${index}`,
    style: 'dato-curioso',
    text: `Reseña del tema ${index} con una descripción sonora breve.`,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const audio = { audio: Buffer.from('mp3'), contentType: 'audio/mpeg', provider: 'fish' as const, cached: false }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireStreamingClient.mockResolvedValue({ clientId: 'client-a', hasRadioStream: true })
  mocks.getAiLiveAccess.mockResolvedValue({
    enabled: true,
    remaining: 100000,
    limit: 200000,
    used: 100000,
    period: '2026-11',
  })
  mocks.hasConfiguredPremiumTts.mockResolvedValue(true)
  mocks.playlist.findFirst.mockResolvedValue({
    shuffle: false,
    entries: entries(7),
  })
  mocks.client.findUnique.mockResolvedValue({
    name: 'Radio',
    basicData: { projectName: 'Radio' },
    radioStream: {
      aiPresenterEnabled: true,
      aiPresenterEvery: 3,
      aiIntroPhrases: null,
      aiReviewEveryTracks: 2,
      aiReviewStyle: 'dato-curioso',
      aiReviewAdminEnabled: true,
    },
  })
  mocks.radioStream.update.mockResolvedValue({})
  mocks.listJingles.mockResolvedValue({ jingles: [] })
  mocks.clearAiIntros.mockResolvedValue({ ok: true })
  mocks.clearAiReviews.mockResolvedValue({ ok: true })
  mocks.uploadAiIntro.mockResolvedValue({ ok: true })
  mocks.uploadAiReview.mockResolvedValue({ ok: true })
  mocks.restart.mockResolvedValue(undefined)
  mocks.consumeAiCharacters.mockResolvedValue(undefined)

  mocks.synthesizePremiumTts.mockResolvedValue(audio)
  mocks.getReviewRecord.mockResolvedValue(null)
  mocks.getArtistReviewRecord.mockResolvedValue(null)
  mocks.getOrCreateReview.mockImplementation(async ({ artist, title }: { artist: string; title: string }) => ({
    ...reviewFor(0),
    id: `rev-${title}`,
    artist,
    title,
    text: `Reseña de ${title} con una descripción sonora breve.`,
  }))
  mocks.getOrCreateArtistReview.mockResolvedValue(null)
  mocks.synthesizeReviewWithLimit.mockImplementation(async ({ text }: { text: string }) => ({
    ...audio,
    text,
    seconds: 12,
  }))
})

describe('aplicar reseñas al AutoDJ', () => {
  it('genera intros y reseñas en sus posiciones', async () => {
    const response = await applyAutoDj(jsonRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({ generatedIntros: 2, generatedReviews: 3, reviewEvery: 2 })
    expect(mocks.uploadAiIntro).toHaveBeenCalledTimes(2)
    expect(mocks.uploadAiReview).toHaveBeenCalledTimes(3)
    const names = mocks.uploadAiReview.mock.calls.map((call) => (call[1] as File).name)
    expect(names).toEqual(['rv-0003-t2.mp3', 'rv-0005-t4.mp3', 'rv-0007-t6.mp3'])
    expect(mocks.clearAiReviews).toHaveBeenCalled()
  })

  it('no genera reseñas con frecuencia 0', async () => {
    mocks.client.findUnique.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio' },
      radioStream: {
        aiPresenterEnabled: true,
        aiPresenterEvery: 3,
        aiIntroPhrases: null,
        aiReviewEveryTracks: 0,
        aiReviewStyle: null,
        aiReviewAdminEnabled: true,
      },
    })

    const response = await applyAutoDj(jsonRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.generatedReviews).toBe(0)
    expect(mocks.getOrCreateReview).not.toHaveBeenCalled()
    expect(mocks.uploadAiReview).not.toHaveBeenCalled()
    expect(mocks.clearAiReviews).toHaveBeenCalled()
  })

  it('no genera reseñas si el admin las apagó', async () => {
    mocks.client.findUnique.mockResolvedValue({
      name: 'Radio',
      basicData: { projectName: 'Radio' },
      radioStream: {
        aiPresenterEnabled: true,
        aiPresenterEvery: 3,
        aiIntroPhrases: null,
        aiReviewEveryTracks: 2,
        aiReviewStyle: 'dato-curioso',
        aiReviewAdminEnabled: false,
      },
    })

    const response = await applyAutoDj(jsonRequest({ reviewEvery: 2 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.generatedReviews).toBe(0)
    expect(mocks.uploadAiReview).not.toHaveBeenCalled()
  })

  it('no falla si la playlist es más corta que la frecuencia de reseñas', async () => {
    mocks.playlist.findFirst.mockResolvedValue({ shuffle: false, entries: entries(3) })

    const response = await applyAutoDj(
      jsonRequest({ enabled: false, reviewsEnabled: true, reviewEvery: 5 })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.generatedReviews).toBe(0)
    expect(mocks.uploadAiReview).not.toHaveBeenCalled()
  })

  it('no emite reseñas desactivadas individualmente ni cae a la biografía', async () => {
    mocks.getReviewRecord.mockImplementation(async ({ title }: { title: string }) =>
      title === 'Tema 2' ? { ...reviewFor(2), active: false } : null
    )

    const response = await applyAutoDj(jsonRequest())
    const data = await response.json()

    expect(data.generatedReviews).toBe(2)
    expect(mocks.getOrCreateReview).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tema 2' })
    )
  })

  it('informa la cuota faltante antes de generar audio', async () => {
    mocks.getAiLiveAccess.mockResolvedValue({
      enabled: true,
      remaining: 10,
      limit: 100,
      used: 90,
      period: '2026-11',
    })

    const response = await applyAutoDj(jsonRequest())
    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error).toBe('ai_quota_exceeded')
    expect(data.missingCharacters).toBeGreaterThan(0)
    expect(mocks.uploadAiIntro).not.toHaveBeenCalled()
    expect(mocks.uploadAiReview).not.toHaveBeenCalled()
  })

  it('no descuenta cuota por reseñas ya cacheadas', async () => {
    mocks.synthesizeReviewWithLimit.mockImplementation(async ({ text }: { text: string }) => ({
      ...audio,
      cached: true,
      text,
      seconds: 12,
    }))

    const response = await applyAutoDj(jsonRequest({ enabled: false, reviewEvery: 2 }))

    expect(response.status).toBe(200)
    expect(mocks.consumeAiCharacters).not.toHaveBeenCalledWith(
      'client-a',
      expect.any(Number),
      'ai-review'
    )
  })

  it('continúa si una reseña falla en DeepSeek o en el TTS', async () => {
    mocks.getOrCreateReview.mockImplementation(async ({ title }: { title: string }) => {
      if (title === 'Tema 2') throw new Error('deepseek caído')
      return {
        ...reviewFor(0),
        id: `rev-${title}`,
        title,
        text: `Reseña de ${title} con una descripción sonora breve.`,
      }
    })
    mocks.synthesizeReviewWithLimit.mockImplementation(async ({ text }: { text: string }) => {
      if (text.includes('Tema 4')) throw new Error('tts caído')
      return { ...audio, text, seconds: 12 }
    })

    const response = await applyAutoDj(jsonRequest({ enabled: false, reviewEvery: 2 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.generatedReviews).toBe(1)
  })

  it('descarta la reseña que supera los 20 segundos', async () => {
    mocks.synthesizeReviewWithLimit.mockResolvedValue(null)

    const response = await applyAutoDj(jsonRequest({ enabled: false, reviewEvery: 2 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.generatedReviews).toBe(0)
    expect(mocks.uploadAiReview).not.toHaveBeenCalled()
  })
})
