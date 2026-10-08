import { escapeHtml } from './ogMeta.ts'

export interface SplashInput {
  image?: string | null
  name?: string | null
}

const MARKER = '<!-- app-splash -->'
// Asset local del cliente (icono propio o compartido), servido por el sitio.
// Carga al instante, a diferencia de una URL remota.
const DEFAULT_LOGO = '/icon-512.png'

/**
 * Marcado del splash de carga. Se usa tanto en el HTML inicial (inyectado en
 * build time, antes de que corra JavaScript) como referencia visual del loader
 * de React. El CSS vive en `index.html` / `LoadingScreen.module.css`.
 */
export function renderSplash(input: SplashInput): string {
  const image = input.image?.trim() || DEFAULT_LOGO
  const name = input.name?.trim() || null
  const nameHtml = name
    ? `<p class="app-splash__name">${escapeHtml(name)}</p>`
    : ''

  return [
    '<div class="app-splash">',
    '  <div class="app-splash__overlay">',
    `    <img class="app-splash__logo" src="${escapeHtml(image)}" alt="" width="320" height="320" />`,
    `    ${nameHtml}`,
    '    <span class="app-splash__spinner" aria-hidden="true"></span>',
    '  </div>',
    '</div>'
  ].join('\n')
}

/**
 * Inyecta el splash en el HTML: reemplaza el marcador `<!-- app-splash -->`
 * (o lo agrega dentro de `#root` si el marcador no está).
 */
export function injectSplash(html: string, input: SplashInput): string {
  const markup = renderSplash(input)
  if (html.includes(MARKER)) return html.replace(MARKER, markup)
  if (html.includes('</div>')) {
    return html.replace('</div>', `${markup}\n</div>`)
  }
  return html
}
