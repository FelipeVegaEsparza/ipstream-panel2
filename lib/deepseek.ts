const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek-chat'
const REQUEST_TIMEOUT_MS = 60_000

export interface DraftNews {
  name: string
  slug: string
  shortText: string
  longText: string
}

export interface CurrentNewsContext {
  fetchedAt: string
  items: Array<{
    title: string
    source: string
    publishedAt: string
    description: string
  }>
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: { message?: string }
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY no está configurada en las variables de entorno')
  }
  return key
}

function buildSystemPrompt(): string {
  return [
    'Eres un redactor jefe de un portal de noticias en español para emisoras de radio.',
    'Tu trabajo es generar lotes de noticias originales, informativas y neutrales.',
    'Reglas estrictas:',
    '- Escribe SIEMPRE en español neutro.',
    '- No incluyas URLs, nombres de marcas inventadas, ni datos personales reales.',
    '- No uses formato markdown ni caracteres de escape (\\\\n, \\").',
    '- El texto corto debe ser atractivo, de 1-2 frases (max 220 caracteres).',
    '- El texto largo debe tener 3-4 párrafos informativos (600-1100 caracteres).',
    '- El slug solo contiene letras minúsculas, números y guiones.',
    '- No repitas el mismo ángulo ni título entre las noticias del lote.',
    '- Cuando el contexto incluya fechas o resultados concretos (marcadores, datos, declaraciones), incorpóralos al texto. Usa referencias temporales como "ayer", "el pasado martes", "esta semana", etc.',
    '- No inventes cifras exactas si el titular no las da; usa "recientes", "varios", "decenas", etc.',
  ].join('\n')
}

function formatContextForPrompt(ctx: CurrentNewsContext): string {
  const lines = ctx.items.map((item, idx) => {
    const when = item.publishedAt
      ? new Date(item.publishedAt).toISOString().slice(0, 16).replace('T', ' ')
      : 'fecha desconocida'
    const desc = item.description ? ` — ${item.description.slice(0, 180)}` : ''
    return `${idx + 1}. [${when}] (${item.source}) ${item.title}${desc}`
  })
  return [
    'Titulares recientes del día (úsalos como inspiración, NO copies frases literales; re-escribe con tus palabras):',
    ...lines,
  ].join('\n')
}

function buildUserPrompt(
  category: { name: string; slug: string; description?: string | null },
  count: number,
  context: CurrentNewsContext
): string {
  const angle = category.description && category.description.trim()
    ? category.description.trim()
    : null

  const angleSection = angle
    ? [
        `Ángulo / descripción de la categoría:`,
        `"""${angle}"""`,
        'SOLO genera noticias que encajen con este ángulo. Si un titular de la lista no aplica, ignóralo completamente.',
      ]
    : [
        'Esta categoría no tiene descripción detallada. Usa el nombre de la categoría como guía del ángulo temático y FILTRA los titulares que no encajen.',
      ]

  return [
    `Categoría: "${category.name}" (slug: ${category.slug})`,
    `Hoy es: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    `Genera exactamente ${count} noticias ORIGINALES para esta categoría, inspiradas en los titulares recientes de abajo.`,
    '',
    ...angleSection,
    '',
    formatContextForPrompt(context),
    '',
    'IMPORTANTE:',
    '- Las noticias se publicarán con una imagen de portada relacionada al titular del que se inspiran; procura que el texto describa o sea coherente con el contexto de esa imagen.',
    '- Si un titular menciona datos concretos (marcadores, cifras, declaraciones), úsalos tal cual aparecen en el titular.',
    '- Si un titular NO aplica al ángulo de la categoría, DESCÁRTALO. Es preferible devolver menos noticias con buena temática que forzar titulares que no encajan.',
    '- Si tras filtrar quedan muy pocos titulares válidos y no llegas a 3 noticias, igualmente devuelve las que puedas, originales y fieles al ángulo.',
    '',
    'Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta:',
    '{',
    '  "items": [',
    '    {',
    '      "name": "Título de la noticia",',
    '      "slug": "titulo-en-kebab-case",',
    '      "shortText": "Resumen de 1-2 frases (max 220 caracteres)",',
    '      "longText": "Desarrollo de 3-4 párrafos separados por saltos de línea (600-1100 caracteres)"',
    '    }',
    '  ]',
    '}',
    '',
    `Devuelve exactamente ${count} objetos en el array "items".`,
  ].join('\n')
}

function parseContent(raw: string | undefined): { items: DraftNews[] } | null {
  if (!raw) return null
  const trimmed = raw.trim()
  try {
    const data = JSON.parse(trimmed)
    if (data && Array.isArray(data.items)) {
      return { items: data.items }
    }
    if (Array.isArray(data)) {
      return { items: data }
    }
    return null
  } catch {
    return null
  }
}

function validateItem(raw: unknown): DraftNews | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const slug = typeof r.slug === 'string' ? r.slug.trim().toLowerCase() : ''
  const shortText = typeof r.shortText === 'string' ? r.shortText.trim() : ''
  const longText = typeof r.longText === 'string' ? r.longText.trim() : ''

  if (!name || !slug || !shortText || !longText) return null
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  if (name.length < 8 || shortText.length < 30 || longText.length < 200) return null
  if (longText.length > 4000) return null
  if (shortText.length > 500) return null

  return { name, slug, shortText, longText }
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[deepseek] API error', res.status, text.slice(0, 500))
      return null
    }

    const data: DeepSeekResponse = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch (error) {
    console.error('[deepseek] request failed:', error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function generateNewsForCategory(
  category: { name: string; slug: string; description?: string | null },
  count: number,
  context: CurrentNewsContext
): Promise<DraftNews[]> {
  const userPrompt = buildUserPrompt(category, count, context)
  const systemPrompt = buildSystemPrompt()

  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseContent(content)
    if (!parsed) {
      console.warn(`[deepseek] intento ${attempt}: respuesta no parseable`)
      continue
    }
    const valid = parsed.items
      .map((item) => validateItem(item))
      .filter((item): item is DraftNews => item !== null)
    if (valid.length > 0) {
      return valid.slice(0, count)
    }
    console.warn(`[deepseek] intento ${attempt}: ningún item válido`)
  }

  return []
}
