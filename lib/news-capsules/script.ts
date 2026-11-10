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

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
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
  const summary = base.slice(0, MAX_BODY_CHARS)
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
    '- Cuerpo de hasta 300 caracteres; resumí la noticia al mínimo indispensable.',
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
