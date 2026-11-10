import * as cheerio from 'cheerio'
import type { ExtractedArticle } from './types'

const MAX_ARTICLE_CHARS = 8_000

function meta($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const value = $(selector).attr('content') || $(selector).text()
    if (value?.trim()) return value.trim()
  }
  return ''
}

function parseDate(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function extractArticle(html: string, url: string): ExtractedArticle {
  const $ = cheerio.load(html)
  $('script, style, noscript, nav, footer, header, aside, form, svg').remove()

  const title =
    meta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    $('h1').first().text().trim() ||
    $('title').first().text().trim()
  const publisher =
    meta($, ['meta[property="og:site_name"]', 'meta[name="application-name"]']) ||
    new URL(url).hostname.replace(/^www\./, '')
  const publishedAt = parseDate(
    meta($, [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="pubdate"]',
    ]) || $('time[datetime]').first().attr('datetime') || ''
  )

  const containers = ['article p', 'main p', '[role="main"] p', 'body p']
  let paragraphs: string[] = []
  for (const selector of containers) {
    paragraphs = $(selector)
      .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter((paragraph) => paragraph.length > 40)
    if (paragraphs.length > 0) break
  }

  const text = paragraphs.join('\n\n').slice(0, MAX_ARTICLE_CHARS)
  if (!title || text.length < 200) {
    throw new Error('No se pudo extraer contenido utilizable del artículo.')
  }

  return {
    id: url,
    title,
    url,
    publisher: publisher || null,
    publishedAt,
    excerpt: text.slice(0, 1200),
    text,
  }
}
