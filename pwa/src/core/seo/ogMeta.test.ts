import { describe, expect, it } from 'vitest'
import { escapeHtml, injectOgMeta, renderOgMeta } from './ogMeta'

describe('escapeHtml', () => {
  it('escapa comillas, ampersand y ángulos', () => {
    expect(escapeHtml(`Rock & "Roll" <b>'x'</b>`)).toBe(
      'Rock &amp; &quot;Roll&quot; &lt;b&gt;&#39;x&#39;&lt;/b&gt;'
    )
  })
})

describe('renderOgMeta', () => {
  it('emite title, description, image, site_name, url y twitter', () => {
    const html = renderOgMeta({
      title: 'Radio Ejemplo',
      description: 'La radio de todos',
      image: 'https://panelipstream.cl/cover.jpg',
      url: 'https://radio.cl',
      siteName: 'Radio Ejemplo'
    })

    expect(html).toContain('property="og:title" content="Radio Ejemplo"')
    expect(html).toContain('property="og:site_name" content="Radio Ejemplo"')
    expect(html).toContain('property="og:description" content="La radio de todos"')
    expect(html).toContain('property="og:image" content="https://panelipstream.cl/cover.jpg"')
    expect(html).toContain('property="og:url" content="https://radio.cl"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('name="twitter:title" content="Radio Ejemplo"')
    expect(html).toContain('name="twitter:image" content="https://panelipstream.cl/cover.jpg"')
  })

  it('omite los tags sin valor y usa twitter summary sin imagen', () => {
    const html = renderOgMeta({ title: 'Solo titulo' })

    expect(html).toContain('property="og:title" content="Solo titulo"')
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('og:url')
    expect(html).toContain('name="twitter:card" content="summary"')
  })

  it('escapa el contenido de los atributos', () => {
    const html = renderOgMeta({ title: 'A & "B" <C>' })
    expect(html).toContain('content="A &amp; &quot;B&quot; &lt;C&gt;"')
    expect(html).not.toContain('content="A & "B" <C>"')
  })
})

describe('injectOgMeta', () => {
  it('reemplaza el marcador y fija el título', () => {
    const html = [
      '<html><head>',
      '<title>IPStream PWA</title>',
      '<!-- og-meta -->',
      '</head><body></body></html>'
    ].join('\n')

    const result = injectOgMeta(html, { title: 'Radio & Test' })

    expect(result).not.toContain('<!-- og-meta -->')
    expect(result).toContain('property="og:title" content="Radio &amp; Test"')
    expect(result).toContain('<title>Radio &amp; Test</title>')
  })

  it('inserta antes de </head> si no hay marcador', () => {
    const result = injectOgMeta('<html><head></head><body></body></html>', {
      title: 'Radio'
    })
    expect(result).toContain('property="og:title" content="Radio"')
    expect(result.indexOf('og:title')).toBeLessThan(result.indexOf('</head>'))
  })
})
