import { describe, expect, it } from 'vitest'
import { injectSplash, renderSplash } from './splash'

const LOCAL_LOGO = '/icon-512.png'

describe('renderSplash', () => {
  it('usa el logo local por defecto y muestra el nombre', () => {
    const html = renderSplash({ name: 'Radio Ejemplo' })

    expect(html).toContain(`src="${LOCAL_LOGO}"`)
    expect(html).toContain('<p class="app-splash__name">Radio Ejemplo</p>')
    expect(html).toContain('app-splash__spinner')
    expect(html).not.toContain('background-image')
  })

  it('permite una imagen explícita', () => {
    const html = renderSplash({ image: '/splash.png', name: 'Radio' })
    expect(html).toContain('src="/splash.png"')
  })

  it('funciona sin nombre', () => {
    const html = renderSplash({})
    expect(html).toContain('app-splash__spinner')
    expect(html).not.toContain('app-splash__name')
  })

  it('escapa el nombre y la imagen', () => {
    const html = renderSplash({ image: '/a?b=1&c=2', name: 'A & "B"' })
    expect(html).toContain('A &amp; &quot;B&quot;')
    expect(html).toContain('/a?b=1&amp;c=2')
  })
})

describe('injectSplash', () => {
  it('reemplaza el marcador', () => {
    const html = '<div id="root"><!-- app-splash --></div>'
    const result = injectSplash(html, { name: 'Radio' })
    expect(result).not.toContain('<!-- app-splash -->')
    expect(result).toContain('app-splash__spinner')
    expect(result).toContain(LOCAL_LOGO)
  })

  it('si no hay marcador, inserta dentro del root', () => {
    const result = injectSplash('<div id="root"></div>', { name: 'Radio' })
    expect(result).toContain('app-splash__spinner')
    expect(result.indexOf('app-splash')).toBeLessThan(result.lastIndexOf('</div>'))
  })
})
