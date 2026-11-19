// =====================================================
// Email branding — logo de CasterFly en todos los correos
// =====================================================

export const EMAIL_LOGO_MARKER = 'data-casterfly-logo="1"'

/** URL absoluta del logo para clientes de correo. */
export function getEmailLogoUrl(): string {
  const base =
    process.env.PANEL_PUBLIC_URL ||
    process.env.NEXTAUTH_URL ||
    'https://panel.casterfly.com'
  return `${base.replace(/\/+$/, '')}/logo-casterfly.png`
}

export function emailLogoHeader(logoUrl: string = getEmailLogoUrl()): string {
  return `<div ${EMAIL_LOGO_MARKER} style="text-align:center;margin:0 0 18px">
  <a href="https://casterfly.com" target="_blank" rel="noopener" style="text-decoration:none">
    <img src="${logoUrl}" alt="CasterFly" width="170" style="display:inline-block;border:0;outline:none;text-decoration:none;height:auto;max-width:170px" />
  </a>
</div>`
}

function hasLogo(html: string): boolean {
  return (
    html.includes(EMAIL_LOGO_MARKER) ||
    /logo-casterfly|images\/logos\/logo|<img[^>]+alt=["']CasterFly["']/i.test(html)
  )
}

/**
 * Garantiza que el HTML del correo tenga el logo de CasterFly.
 * - Si la plantilla ya lo incluye, no lo duplica.
 * - Si tiene el contenedor centrado típico, inserta el logo dentro.
 * - Si no, envuelve el contenido con un header de marca.
 */
export function withCasterflyLogo(html: string): string {
  if (!html || hasLogo(html)) return html

  const header = emailLogoHeader()
  const centered = '<div style="max-width:560px;margin:0 auto">'
  if (html.includes(centered)) {
    return html.replace(centered, `${centered}${header}`)
  }

  return `<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px 12px">
  ${header}
  <div style="max-width:560px;margin:0 auto">${html}</div>
</div>`
}
