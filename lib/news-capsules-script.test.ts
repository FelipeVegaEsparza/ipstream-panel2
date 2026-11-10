import { describe, expect, it, vi } from 'vitest'

const deepseek = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock('@/lib/deepseek', () => ({ callDeepSeekJson: deepseek.call }))

const { buildFallbackScript, cleanCopy, generateNewsScript, generateNewsItemSummaries, estimateScriptCharacters } = await import('./news-capsules/script')

const item = {
  id: '1',
  title: 'Noticia de prueba',
  url: 'https://example.com/1',
  publisher: 'Medio',
  publishedAt: null,
  excerpt: 'Resumen de la noticia de prueba.',
}

describe('news script', () => {
  it('usa la respuesta de IA válida', async () => {
    deepseek.call.mockResolvedValue({
      summary: 'Resumen',
      intro: 'Intro de la radio.',
      body: 'Cuerpo de la noticia con suficiente contenido.',
      closing: 'Cierre de la radio.',
    })
    const script = await generateNewsScript({ stationName: 'Radio', items: [item] })
    expect(script.body).toContain('Cuerpo')
    expect(estimateScriptCharacters(script)).toBeGreaterThan(20)
  })

  it('cae al texto de respaldo si la IA falla', async () => {
    deepseek.call.mockResolvedValue(null)
    const script = await generateNewsScript({
      stationName: 'Radio',
      items: [item],
      manualText: 'Texto manual de la noticia.',
    })
    expect(script.body).toContain('Texto manual')
    expect(script.intro).toContain('Radio')
  })

  it('genera un resumen separado por noticia', async () => {
    deepseek.call.mockResolvedValue({
      items: [
        { index: 0, summary: 'Resumen de la primera noticia.' },
        { index: 1, summary: 'Resumen de la segunda noticia.' },
      ],
    })
    const summaries = await generateNewsItemSummaries({
      stationName: 'Radio',
      items: [item, { ...item, id: '2', title: 'Segunda' }],
    })
    expect(summaries).toHaveLength(2)
    expect(summaries[1]).toContain('segunda')
  })

  it('limpia markdown y etiquetas del texto de IA', () => {
    expect(cleanCopy('**Resumen:** Noticia [1] con `detalle`.', 300)).toBe('Resumen: Noticia con detalle.')
  })

  it('recorta sin partir palabras y cierra la frase', () => {
    const text = 'Una noticia importante con información suficiente para explicar lo que pasó y por qué importa a la audiencia de la radio.'
    const cleaned = cleanCopy(text, 60)
    expect(cleaned.length).toBeLessThanOrEqual(61)
    expect(cleaned.endsWith('.')).toBe(true)
    expect(text.startsWith(cleaned.slice(0, -1))).toBe(true)
    expect(cleaned).not.toMatch(/\s(y|o|que|de|la)$/i)
  })

  it('prioriza una oración completa al recortar', () => {
    const cleaned = cleanCopy('Primera oración completa. Segunda oración que sobra y se debe quitar.', 40)
    expect(cleaned).toBe('Primera oración completa.')
  })

  it('limita el cuerpo a 300 caracteres', () => {
    const long = 'x'.repeat(1200)
    const script = buildFallbackScript('Radio', [{ ...item, excerpt: long }])
    expect(script.body.length).toBeLessThanOrEqual(300)
  })

  it('compone un fallback con intro y cierre', () => {
    const script = buildFallbackScript('Radio', [item])
    expect(script.intro).toContain('Noticias en Radio')
    expect(script.closing).toContain('Radio')
  })
})
