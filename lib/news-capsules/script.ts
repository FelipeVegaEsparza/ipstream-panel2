import { callDeepSeekJson } from '@/lib/deepseek'
import type { NewsSourceItem } from './types'

export interface NewsScript {
  summary: string
  intro: string
  body: string
  closing: string
}

const MAX_BODY_CHARS = 300
const MAX_SOURCE_CHARS = 4_000

const TRAILING_CONNECTOR = /\b(y|o|u|pero|que|de|del|la|el|los|las|un|una|en|con|por|para|al|se|su|sus|es|son|fue|ha|han)\s*$/i

/**
 * Limpia texto de IA y lo recorta sin partir palabras.
 * Prioriza terminar en una oración completa; si no entra, corta en el
 * último espacio y cierra con punto para que la locución no quede a medias.
 */
export function cleanCopy(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  let text = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\d+\]/g, '')
    .replace(/[*_`#>]+/g, ' ')
    .replace(/^(resumen|noticia|cuerpo|titular|intro|cierre)\s*:\s*/i, '')
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
  if (!text) return ''

  if (text.length > max) {
    const cut = text.slice(0, max)
    const sentenceEnd = Math.max(
      cut.lastIndexOf('. '),
      cut.lastIndexOf('! '),
      cut.lastIndexOf('? ')
    )
    if (sentenceEnd >= Math.floor(max * 0.45)) {
      text = cut.slice(0, sentenceEnd + 1)
    } else {
      const space = cut.lastIndexOf(' ')
      text = cut.slice(0, space > 0 ? space : max)
      text = text.replace(/[,;:–—-]+$/, '').trim()
      while (TRAILING_CONNECTOR.test(text)) {
        text = text.replace(TRAILING_CONNECTOR, '').replace(/[,;:–—-]+$/, '').trim()
      }
    }
  }

  text = text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\.{2,}$/,'.')
    .replace(/[,;:]$/,'')
    .trim()
  if (text && !/[.!?]$/.test(text)) text += '.'
  return text
}

function clean(value: unknown, max: number): string {
  return cleanCopy(value, max)
}

export function defaultNewsIntro(stationName: string): string {
  return `Noticias en ${stationName}.`
}

export function defaultNewsClosing(stationName: string): string {
  return `Esto fue el resumen de noticias de ${stationName}. Seguimos con la música.`
}

export function buildFallbackScript(
  stationName: string,
  items: NewsSourceItem[],
  manualText?: string
): NewsScript {
  const base = (manualText || items.map((item) => `${item.title}. ${item.excerpt}`).join(' '))
    .replace(/\s+/g, ' ')
    .trim()
  const summary = cleanCopy(base, MAX_BODY_CHARS)
  return {
    summary,
    intro: defaultNewsIntro(stationName),
    body: summary || 'No hay contenido disponible para esta cápsula.',
    closing: defaultNewsClosing(stationName),
  }
}

export function validateNewsScript(raw: unknown): NewsScript | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const summary = clean(record.summary, MAX_BODY_CHARS)
  const body = clean(record.body, MAX_BODY_CHARS)
  const intro = clean(record.intro, 300)
  const closing = clean(record.closing, 300)
  if (!summary || !body || !intro || !closing) return null
  return { summary, intro, body, closing }
}

export function estimateScriptCharacters(script: Pick<NewsScript, 'intro' | 'body' | 'closing'>): number {
  return script.intro.length + script.body.length + script.closing.length
}

export function buildNewsPrompt(stationName: string, items: NewsSourceItem[], manualText?: string): string {
  const sources = items
    .map((item, index) => {
      const publisher = item.publisher ? ` (${item.publisher})` : ''
      return `${index + 1}. ${item.title}${publisher}\n${item.excerpt}`.slice(0, 900)
    })
    .join('\n\n')
    .slice(0, MAX_SOURCE_CHARS)
  return [
    `Emisora: ${stationName}`,
    'Redactá una cápsula de noticias breve para radio.',
    'Reglas:',
    '- Español neutro, tono informativo y neutral.',
    '- No copies frases literales extensas; resumí con tus palabras.',
    '- Cuerpo de hasta 300 caracteres, en una o dos frases completas; resumí la noticia al mínimo indispensable. No cortes palabras ni dejes frases a medias.',
    '- Intro y cierre de una frase, mencionando la emisora.',
    '- Mencioná el medio de origen de forma natural cuando aporte contexto.',
    '- No inventes datos que no estén en las fuentes.',
    '',
    manualText ? `Texto base del cliente:\n${manualText.slice(0, MAX_SOURCE_CHARS)}` : '',
    !manualText && sources ? `Fuentes:\n${sources}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateNewsScript(input: {
  stationName: string
  items: NewsSourceItem[]
  manualText?: string
}): Promise<NewsScript> {
  const fallback = buildFallbackScript(input.stationName, input.items, input.manualText)
  const prompt = buildNewsPrompt(input.stationName, input.items, input.manualText)
  const result = await callDeepSeekJson<unknown>(
    [
      'Sos un redactor de radio. Respondés únicamente con JSON válido.',
      'El JSON debe tener exactamente: summary, intro, body, closing.',
      'No uses markdown ni bloques de código.',
    ].join(' '),
    prompt
  )
  return validateNewsScript(result) ?? fallback
}


export interface NewsItemInput {
  title: string
  sourceUrl?: string | null
  publisher?: string | null
  excerpt?: string | null
  text?: string | null
}

export function defaultCapsuleIntro(stationName: string): string {
  return `Noticias en ${stationName}.`
}

export function defaultCapsuleClosing(stationName: string): string {
  return `Esto fue el resumen de noticias de ${stationName}. Seguimos con la música.`
}

export function buildItemSummaryFallback(item: NewsItemInput): string {
  return clean(item.text || item.excerpt || item.title, MAX_BODY_CHARS)
}

export function validateItemSummaries(raw: unknown, count: number): string[] | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.items)) return null
  const summaries = Array.from({ length: count }, () => '')
  for (const entry of record.items) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const index = Number(item.index)
    const summary = clean(item.summary, MAX_BODY_CHARS)
    if (Number.isInteger(index) && index >= 0 && index < count && summary) {
      summaries[index] = summary
    }
  }
  return summaries.every(Boolean) ? summaries : null
}

export async function generateNewsItemSummaries(input: {
  stationName: string
  items: NewsItemInput[]
}): Promise<string[]> {
  const fallback = input.items.map((item) => buildItemSummaryFallback(item))
  if (input.items.length === 0) return []
  const sourceBlocks = input.items
    .map((item, index) => {
      const publisher = item.publisher ? ` (${item.publisher})` : ''
      const body = (item.text || item.excerpt || '').slice(0, 1200)
      return `[${index}] ${item.title}${publisher}\n${body}`
    })
    .join('\n\n')
    .slice(0, 8000)
  const prompt = [
    `Emisora: ${input.stationName}`,
    `Resumí cada una de las ${input.items.length} noticias por separado para leerlas en radio.`,
    'Reglas:',
    '- Español neutro, informativo y neutral.',
    '- Cada resumen debe tener como máximo 300 caracteres y terminar en una o dos frases completas. No cortes palabras ni dejes frases a medias.',
    '- No copies frases literales extensas; resumí con tus palabras.',
    '- No inventes datos que no estén en la fuente.',
    '- Respondé solo con JSON: {"items":[{"index":0,"summary":"..."}]}',
    '',
    sourceBlocks,
  ].join('\n')
  const result = await callDeepSeekJson<unknown>(
    'Sos un redactor de radio. Respondés únicamente con JSON válido, sin markdown.',
    prompt
  )
  return validateItemSummaries(result, input.items.length) ?? fallback
}
