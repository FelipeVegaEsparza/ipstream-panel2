import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  synthesizePremiumTts: vi.fn(),
  probeAudioBufferDuration: vi.fn(),
  callDeepSeekJson: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiReview: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/premium-tts', () => ({
  synthesizePremiumTts: mocks.synthesizePremiumTts,
}))

vi.mock('@/lib/audio-mix', () => ({
  probeAudioBufferDuration: mocks.probeAudioBufferDuration,
}))

vi.mock('@/lib/deepseek', () => ({
  callDeepSeekJson: mocks.callDeepSeekJson,
}))

import {
  MAX_REVIEW_SECONDS,
  buildReviewKeys,
  buildReviewPrompt,
  clampReviewText,
  containsForbiddenContent,
  generateReviewText,
  normalizeReviewKey,
  parseReviewResponse,
  synthesizeReviewWithLimit,
} from './ai-reviews'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('clave de cache de reseñas', () => {
  it('normaliza mayúsculas, acentos y espacios repetidos', () => {
    expect(normalizeReviewKey('Soda Stereo')).toBe('soda stereo')
    expect(normalizeReviewKey('soda  stereo')).toBe('soda stereo')
    expect(normalizeReviewKey('Café Tacvba')).toBe('cafe tacvba')
    expect(normalizeReviewKey('  Zoé  ')).toBe('zoe')
  })

  it('limpia sufijos de video y arma claves estables', () => {
    const keys = buildReviewKeys('Soda Stereo', 'De Música Ligera (Official Video)')
    expect(keys.artist).toBe('Soda Stereo')
    expect(keys.title).toBe('De Música Ligera')
    expect(keys.artistKey).toBe('soda stereo')
    expect(keys.titleKey).toBe('de musica ligera')
  })
})

describe('prompt de reseña', () => {
  const track = { artist: 'Los Prisioneros', title: 'El baile de los que sobran' }

  it('incluye el estilo pedido en cada variante', () => {
    expect(buildReviewPrompt('dato-curioso', track, true).user).toContain('Estilo pedido: dato-curioso')
    expect(buildReviewPrompt('detras-de-la-cancion', track, true).user).toContain('detras-de-la-cancion')
    expect(buildReviewPrompt('contexto-historico', track, true).user).toContain('contexto-historico')
    expect(buildReviewPrompt('biografia', track, true).user).toContain('biografia')
  })

  it('cambia la apertura según si hubo presentación', () => {
    const withIntro = buildReviewPrompt('dato-curioso', track, true).user
    const withoutIntro = buildReviewPrompt('dato-curioso', track, false).user
    expect(withIntro).toContain('La presentación ya nombró el tema')
    expect(withoutIntro).toContain('No hubo presentación')
    expect(withIntro).not.toBe(withoutIntro)
  })

  it('refuerza el modo descriptivo en el reintento', () => {
    expect(buildReviewPrompt('biografia', track, true, true).user).toContain('sé 100% descriptivo')
  })
})

describe('validación de la respuesta de DeepSeek', () => {
  const validText =
    'Un dato: la canción no tiene solo de guitarra y dice todo en la primera estrofa, sin guardarse nada para el final.'

  it('acepta una respuesta descriptiva válida', () => {
    const result = parseReviewResponse({ texto: validText, tipo: 'descriptivo', seguro: false })
    expect(result?.text).toBe(validText)
    expect(result?.type).toBe('descriptivo')
  })

  it('descarta historia o biografía cuando el modelo no está seguro', () => {
    expect(parseReviewResponse({ texto: validText, tipo: 'historico', seguro: false })).toBeNull()
    expect(parseReviewResponse({ texto: validText, tipo: 'biografico', seguro: false })).toBeNull()
  })

  it('acepta historia cuando el modelo declara confianza', () => {
    const result = parseReviewResponse({ texto: validText, tipo: 'historico', seguro: true })
    expect(result?.type).toBe('historico')
  })

  it('descarta texto con años, cifras o temas sensibles', () => {
    expect(parseReviewResponse({ texto: `${validText} Fue grabada en 1986.`, tipo: 'historico', seguro: true })).toBeNull()
    expect(parseReviewResponse({ texto: `${validText} Vendió millones de copias.`, tipo: 'descriptivo', seguro: true })).toBeNull()
  })

  it('descarta respuestas inválidas o demasiado cortas', () => {
    expect(parseReviewResponse(null)).toBeNull()
    expect(parseReviewResponse({ texto: 'Muy corto.' })).toBeNull()
  })
})

describe('política de contenido', () => {
  it('detecta fechas, cifras y temas prohibidos', () => {
    expect(containsForbiddenContent('La canción es de 1990.')).toBe(true)
    expect(containsForbiddenContent('Ganó un Grammy y un disco de platino.')).toBe(true)
    expect(containsForbiddenContent('El cantante murió joven.')).toBe(true)
    expect(containsForbiddenContent('Un tema político de la época.')).toBe(true)
  })

  it('deja pasar descripciones sonoras', () => {
    expect(containsForbiddenContent('Un tema alegre, con guitarras limpias y un ritmo bailable.')).toBe(false)
    expect(containsForbiddenContent('Habla de la vida en el campo y la ciudad.')).toBe(false)
  })
})

describe('recorte por oración', () => {
  it('deja intacto un texto corto', () => {
    expect(clampReviewText('Un dato corto.')).toBe('Un dato corto.')
  })

  it('corta en el último punto completo', () => {
    const text = 'Primera frase con datos. Segunda frase que se va a cortar por el límite de caracteres permitidos.'
    const result = clampReviewText(text, 45)
    expect(result).toBe('Primera frase con datos.')
  })

  it('corta en el último espacio si no hay punto útil', () => {
    const text = 'palabra '.repeat(50)
    const result = clampReviewText(text, 30)
    expect(result.endsWith('.')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(31)
  })
})

describe('generación de texto', () => {
  it('reintenta en modo descriptivo si la primera respuesta es inválida', async () => {
    mocks.callDeepSeekJson
      .mockResolvedValueOnce({ texto: 'La canción es de 1986 y ganó un Grammy importante.', tipo: 'historico', seguro: true })
      .mockResolvedValueOnce({
        texto: 'Un tema con guitarras limpias y un ritmo que invita a bailar en la primera escucha.',
        tipo: 'descriptivo',
        seguro: false,
      })

    const result = await generateReviewText({
      artist: 'Artista',
      title: 'Tema',
      style: 'biografia',
      hasIntro: true,
    })

    expect(mocks.callDeepSeekJson).toHaveBeenCalledTimes(2)
    expect(result?.type).toBe('descriptivo')
  })

  it('devuelve null si ninguna respuesta sirve', async () => {
    mocks.callDeepSeekJson.mockResolvedValue({ texto: 'corto' })
    await expect(
      generateReviewText({ artist: 'A', title: 'B', style: 'dato-curioso', hasIntro: true })
    ).resolves.toBeNull()
  })
})

describe('audio con tope de 20 segundos', () => {
  const audio = { audio: Buffer.from('mp3'), contentType: 'audio/mpeg', provider: 'fish' as const, cached: false }

  it('usa el audio tal cual si entra en el tope', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValue(12)

    const result = await synthesizeReviewWithLimit({ clientId: 'c1', text: 'Un dato breve.' })

    expect(result?.seconds).toBe(12)
    expect(result?.text).toBe('Un dato breve.')
    expect(mocks.synthesizePremiumTts).toHaveBeenCalledTimes(1)
    expect(MAX_REVIEW_SECONDS).toBe(20)
  })

  it('recorta el texto y reintenta si se pasa del tope', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValueOnce(28).mockResolvedValueOnce(18)

    const longText = 'Primera frase de la reseña que ocupa bastante. Segunda frase que también suma caracteres al total.'
    const result = await synthesizeReviewWithLimit({ clientId: 'c1', text: longText })

    expect(mocks.synthesizePremiumTts).toHaveBeenCalledTimes(2)
    expect(result?.text).toBe('Primera frase de la reseña que ocupa bastante.')
  })

  it('descarta la reseña si el reintento sigue excedido', async () => {
    mocks.synthesizePremiumTts.mockResolvedValue(audio)
    mocks.probeAudioBufferDuration.mockResolvedValue(30)

    const result = await synthesizeReviewWithLimit({
      clientId: 'c1',
      text: 'Primera frase de la reseña que ocupa bastante. Segunda frase que también suma caracteres al total.',
    })

    expect(result).toBeNull()
  })
})
