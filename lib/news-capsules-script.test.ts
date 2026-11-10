import { describe, expect, it, vi } from 'vitest'

const deepseek = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock('@/lib/deepseek', () => ({ callDeepSeekJson: deepseek.call }))

const { buildFallbackScript, generateNewsScript, estimateScriptCharacters } = await import('./news-capsules/script')

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
