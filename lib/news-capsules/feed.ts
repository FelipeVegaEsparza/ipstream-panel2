import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import type { NewsSourceItem, ParsedFeed } from './types'

const MAX_ITEMS = 30

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function text(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return text(record['#text'] ?? record.__text ?? record.value ?? '')
  }
  return ''
}

function linkOf(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = linkOf(entry)
      if (resolved) return resolved
    }
    return ''
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const rel = text(record['@_rel'])
    if (rel && rel !== 'alternate') return ''
    return text(record['@_href'] ?? record['@_url'] ?? record['#text'])
  }
  return ''
}

function stripHtml(html: string): string {
  if (!html) return ''
  try {
    const $ = cheerio.load(html)
    $('script, style, noscript').remove()
    return $.root().text().replace(/\s+/g, ' ').trim()
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function dateOf(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toItem(entry: unknown, fallbackPublisher: string | null): NewsSourceItem | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as Record<string, unknown>
  const title = stripHtml(text(record.title))
  const url = linkOf(record.link)
  if (!title || !url) return null
  const publisher =
    stripHtml(text(record.author ?? record['dc:creator'] ?? record.source)) || fallbackPublisher
  const id = text(record.guid ?? record.id ?? record['@_id']) || url
  const description = text(
    record.description ??
      record.summary ??
      record['content:encoded'] ??
      record.content ??
      ''
  )
  return {
    id,
    title,
    url,
    publisher: publisher || null,
    publishedAt: dateOf(record.pubDate ?? record.published ?? record.updated ?? record['dc:date']),
    excerpt: stripHtml(description).slice(0, 1200),
  }
}

export function parseFeed(xml: string, feedUrl: string): ParsedFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    processEntities: true,
    trimValues: true,
  })
  const parsed = parser.parse(xml) as Record<string, unknown>
  const rss = parsed.rss as Record<string, unknown> | undefined
  const atom = parsed.feed as Record<string, unknown> | undefined
  const channel = rss?.channel as Record<string, unknown> | undefined
  const publisher = stripHtml(text(channel?.title ?? atom?.title)) || null
  const entries = rss
    ? asArray(channel?.item as unknown)
    : asArray(atom?.entry as unknown)

  const items = entries
    .map((entry) => toItem(entry, publisher))
    .filter((item): item is NewsSourceItem => item !== null)
    .map((item) => ({ ...item, url: new URL(item.url, feedUrl).toString() }))
    .slice(0, MAX_ITEMS)

  if (items.length === 0) {
    throw new Error('El feed no contiene ítems utilizables.')
  }
  return { publisher, items }
}
