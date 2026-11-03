import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  radioStream: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
  },
  requireStreamingClient: vi.fn(),
  getAiLiveAccess: vi.fn(),
  getVoiceCatalog: vi.fn(),
  getTtsProvider: vi.fn(),
  getElevenLabsConfig: vi.fn(),
  getFishAudioConfig: vi.fn(),
  hasConfiguredPremiumTts: vi.fn(),
  clearAiIntros: vi.fn(),
  clearAiReviews: vi.fn(),
  restart: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    radioStream: mocks.radioStream,
    client: mocks.client,
  },
}))

vi.mock('@/lib/streaming-auth', () => {
  class StreamingAuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  }
  return {
    StreamingAuthError,
    requireStreamingClient: mocks.requireStreamingClient,
  }
})

vi.mock('@/lib/ai-live', () => ({
  getAiLiveAccess: mocks.getAiLiveAccess,
}))

vi.mock('@/lib/elevenlabs-voices', () => ({
  getVoiceCatalog: mocks.getVoiceCatalog,
}))

vi.mock('@/lib/streaming-client', () => ({
  streamingClient: {
    clearAiIntros: mocks.clearAiIntros,
    clearAiReviews: mocks.clearAiReviews,
    restart: mocks.restart,
  },
}))

vi.mock('@/lib/tts-provider', () => ({
  getTtsProvider: mocks.getTtsProvider,
}))

vi.mock('@/lib/elevenlabs-config', () => ({
  getElevenLabsConfig: mocks.getElevenLabsConfig,
}))

vi.mock('@/lib/fish-audio-config', () => ({
  getFishAudioConfig: mocks.getFishAudioConfig,
}))

vi.mock('@/lib/premium-tts', () => ({
  hasConfiguredPremiumTts: mocks.hasConfiguredPremiumTts,
}))

import { GET as getConfig, PUT as saveConfig } from '@/app/api/dashboard/streaming/ai/config/route'

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard/streaming/ai/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function radioRow(overrides: Record<string, unknown> = {}) {
  return {
    aiPresenterEnabled: false,
    aiPresenterEvery: 3,
    aiIntroPhrases: null,
    aiTimeEveryMinutes: 0,
    aiWeatherEveryMinutes: 0,
    aiVoiceId: null,
    fishVoiceId: null,
    aiVoiceStyle: 0,
    aiVoicePreset: null,
    aiReviewEveryTracks: 0,
    aiReviewStyle: null,
    aiReviewAdminEnabled: true,
    ...overrides,
  }
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    enabled: false,
    every: 3,
    voiceId: '',
    voiceStyle: 0,
    timeEveryMinutes: 0,
    weatherEveryMinutes: 0,
    phrases: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireStreamingClient.mockResolvedValue({ clientId: 'client-a', hasRadioStream: true })
  mocks.getAiLiveAccess.mockResolvedValue({
    enabled: true,
    remaining: 1000,
    limit: 2000,
    used: 1000,
    period: '2026-11',
  })
  mocks.getVoiceCatalog.mockResolvedValue([])
  mocks.getTtsProvider.mockResolvedValue('fish')
  mocks.getElevenLabsConfig.mockResolvedValue({ qualityPreset: null })
  mocks.getFishAudioConfig.mockResolvedValue({ voices: [] })
  mocks.hasConfiguredPremiumTts.mockResolvedValue(true)
  mocks.radioStream.findUnique.mockResolvedValue(radioRow())
  mocks.radioStream.update.mockResolvedValue(radioRow())
  mocks.client.findUnique.mockResolvedValue({ name: 'Radio', basicData: { projectName: 'Radio' } })
  mocks.clearAiIntros.mockResolvedValue({ ok: true })
  mocks.clearAiReviews.mockResolvedValue({ ok: true })
  mocks.restart.mockResolvedValue(undefined)
})

describe('configuración de reseñas IA', () => {
  it('expone el estado de las reseñas en el GET', async () => {
    mocks.radioStream.findUnique.mockResolvedValue(
      radioRow({ aiReviewEveryTracks: 5, aiReviewStyle: 'biografia' })
    )

    const response = await getConfig()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      reviewsEnabled: true,
      reviewEvery: 5,
      reviewStyle: 'biografia',
      reviewAdminEnabled: true,
    })
  })

  it('guarda una frecuencia y estilo válidos', async () => {
    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: true, reviewEvery: 5, reviewStyle: 'contexto-historico' }))
    )

    expect(response.status).toBe(200)
    expect(mocks.radioStream.update).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      data: expect.objectContaining({
        aiReviewEveryTracks: 5,
        aiReviewStyle: 'contexto-historico',
      }),
    })
  })

  it('rechaza una frecuencia fuera de rango', async () => {
    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: true, reviewEvery: 21, reviewStyle: 'dato-curioso' }))
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_review_every' })
    expect(mocks.radioStream.update).not.toHaveBeenCalled()
  })

  it('rechaza una frecuencia menor a 2 si las reseñas están activas', async () => {
    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: true, reviewEvery: 1, reviewStyle: 'dato-curioso' }))
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_review_every' })
  })

  it('rechaza un estilo desconocido', async () => {
    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: true, reviewEvery: 4, reviewStyle: 'inventado' }))
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'invalid_review_style' })
    expect(mocks.radioStream.update).not.toHaveBeenCalled()
  })

  it('no permite activar reseñas si el admin las apagó', async () => {
    mocks.radioStream.findUnique.mockResolvedValue(radioRow({ aiReviewAdminEnabled: false }))

    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: true, reviewEvery: 4, reviewStyle: 'dato-curioso' }))
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: 'reviews_disabled_by_admin' })
    expect(mocks.radioStream.update).not.toHaveBeenCalled()
  })

  it('limpia las reseñas y reinicia al desactivarlas', async () => {
    mocks.radioStream.findUnique.mockResolvedValue(
      radioRow({ aiReviewEveryTracks: 5, aiReviewStyle: 'dato-curioso' })
    )

    const response = await saveConfig(
      jsonRequest(payload({ reviewsEnabled: false, reviewEvery: 0, reviewStyle: 'dato-curioso' }))
    )

    expect(response.status).toBe(200)
    expect(mocks.clearAiReviews).toHaveBeenCalledWith('client-a')
    expect(mocks.restart).toHaveBeenCalledWith('client-a')
  })

  it('conserva la configuración previa si el PUT no trae campos de reseñas', async () => {
    mocks.radioStream.findUnique.mockResolvedValue(radioRow({ aiReviewEveryTracks: 5 }))

    const response = await saveConfig(jsonRequest(payload()))

    expect(response.status).toBe(200)
    expect(mocks.radioStream.update).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      data: expect.not.objectContaining({ aiReviewEveryTracks: expect.anything() }),
    })
    expect(mocks.clearAiReviews).not.toHaveBeenCalled()
  })
})
