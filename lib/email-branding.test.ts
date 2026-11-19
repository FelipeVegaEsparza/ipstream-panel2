import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  EMAIL_LOGO_MARKER,
  getEmailLogoUrl,
  withCasterflyLogo,
} from './email-branding'
import { renderTemplate } from './email-templates'

const originalPanelUrl = process.env.PANEL_PUBLIC_URL
const originalNextAuthUrl = process.env.NEXTAUTH_URL

beforeEach(() => {
  process.env.PANEL_PUBLIC_URL = 'https://panel.example.com/'
  delete process.env.NEXTAUTH_URL
})

afterEach(() => {
  if (originalPanelUrl === undefined) delete process.env.PANEL_PUBLIC_URL
  else process.env.PANEL_PUBLIC_URL = originalPanelUrl
  if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL
  else process.env.NEXTAUTH_URL = originalNextAuthUrl
})

describe('getEmailLogoUrl', () => {
  it('usa la URL pública del panel y el logo claro', () => {
    expect(getEmailLogoUrl()).toBe('https://panel.example.com/logo-casterfly.png')
  })

  it('cae a NEXTAUTH_URL', () => {
    delete process.env.PANEL_PUBLIC_URL
    process.env.NEXTAUTH_URL = 'https://panel.casterfly.com'
    expect(getEmailLogoUrl()).toBe('https://panel.casterfly.com/logo-casterfly.png')
  })
})

describe('withCasterflyLogo', () => {
  it('inserta el logo dentro del contenedor centrado', () => {
    const html = withCasterflyLogo(
      '<div style="max-width:560px;margin:0 auto"><p>Hola</p></div>'
    )
    expect(html).toContain(EMAIL_LOGO_MARKER)
    expect(html).toContain('https://panel.example.com/logo-casterfly.png')
    expect(html).toContain('alt="CasterFly"')
  })

  it('envuelve el contenido si no encuentra el contenedor', () => {
    const html = withCasterflyLogo('<p>Hola</p>')
    expect(html).toContain(EMAIL_LOGO_MARKER)
    expect(html).toContain('<p>Hola</p>')
  })

  it('no duplica el logo si ya existe', () => {
    const first = withCasterflyLogo('<p>Hola</p>')
    const second = withCasterflyLogo(first)
    expect(second).toBe(first)
    expect(second.match(new RegExp(EMAIL_LOGO_MARKER, 'g'))).toHaveLength(1)
  })

  it('respeta un logo existente de CasterFly', () => {
    const html = '<img src="/logo-casterfly.png" alt="CasterFly" />'
    expect(withCasterflyLogo(html)).toBe(html)
  })
})

describe('renderTemplate con logoUrl', () => {
  it('reemplaza la variable del logo', () => {
    const { html } = renderTemplate(
      { subject: 'Hola', htmlBody: '<img src="{{logoUrl}}" alt="CasterFly" />' },
      { logoUrl: 'https://panel.example.com/logo-casterfly.png' }
    )
    expect(html).toBe(
      '<img src="https://panel.example.com/logo-casterfly.png" alt="CasterFly" />'
    )
  })
})
