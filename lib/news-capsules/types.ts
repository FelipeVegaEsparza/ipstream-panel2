export interface NewsSourceItem {
  id: string
  title: string
  url: string
  publisher: string | null
  publishedAt: string | null
  excerpt: string
}

export interface ParsedFeed {
  publisher: string | null
  items: NewsSourceItem[]
}

export interface ExtractedArticle {
  id: string
  title: string
  url: string
  publisher: string | null
  publishedAt: string | null
  excerpt: string
  text: string
}

export type NewsRuleKind = 'tracks' | 'times' | 'interval_hours'

export interface NewsCapsuleRuleInput {
  kind: NewsRuleKind
  config: {
    everyTracks?: number
    times?: string[]
    everyHours?: number
    startAt?: string
  }
  days?: number[] | null
  active?: boolean
}
