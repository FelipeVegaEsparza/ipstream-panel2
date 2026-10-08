export interface OgMetaInput {
  title?: string | null
  description?: string | null
  image?: string | null
  url?: string | null
  siteName?: string | null
}

const MARKER = '<!-- og-meta -->'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function propertyMeta(property: string, content: string): string {
  return `    <meta property="${property}" content="${escapeHtml(content)}" />`
}

function nameMeta(name: string, content: string): string {
  return `    <meta name="${name}" content="${escapeHtml(content)}" />`
}

/**
 * Construye los tags Open Graph/Twitter para el HTML del build. Solo emite los
 * tags con valor disponible; omite los vacíos.
 */
export function renderOgMeta(input: OgMetaInput): string {
  const title = input.title?.trim() || null
  const description = input.description?.trim() || null
  const image = input.image?.trim() || null
  const url = input.url?.trim() || null
  const siteName = input.siteName?.trim() || title

  const lines: string[] = [propertyMeta('og:type', 'website')]
  if (siteName) lines.push(propertyMeta('og:site_name', siteName))
  if (title) {
    lines.push(
      propertyMeta('og:title', title),
      nameMeta('twitter:title', title)
    )
  }
  if (description) {
    lines.push(
      propertyMeta('og:description', description),
      nameMeta('twitter:description', description)
    )
  }
  if (image) {
    lines.push(
      propertyMeta('og:image', image),
      nameMeta('twitter:image', image)
    )
  }
  if (url) lines.push(propertyMeta('og:url', url))
  lines.push(
    nameMeta('twitter:card', image ? 'summary_large_image' : 'summary')
  )

  return lines.join('\n')
}

/**
 * Inyecta los metadatos en el HTML: reemplaza el marcador `<!-- og-meta -->`
 * (o los inserta antes de `</head>`) y fija `<title>` con el nombre.
 */
export function injectOgMeta(html: string, input: OgMetaInput): string {
  const tags = renderOgMeta(input)
  let result = html.includes(MARKER)
    ? html.replace(MARKER, tags)
    : html.replace('</head>', `${tags}\n  </head>`)

  const title = input.title?.trim()
  if (title) {
    result = result.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`
    )
  }

  return result
}
