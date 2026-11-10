import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import type { NewsRuleKind } from './types'
import {
  nextEmissionAt,
  type NewsCapsuleScheduleData,
  type NewsRuleConfig,
  type NewsRuleData,
} from './rules'

export const NEWS_CAPSULE_STATUSES = ['draft', 'approved', 'paused', 'error', 'deleted'] as const
export type NewsCapsuleStatus = (typeof NEWS_CAPSULE_STATUSES)[number]

export interface SerializedNewsCapsule {
  id: string
  title: string
  status: NewsCapsuleStatus
  summary: string | null
  scriptIntro: string | null
  scriptBody: string | null
  scriptClosing: string | null
  sourceText: string | null
  musicTrackId: string | null
  musicTrack: { id: string; name: string; artist: string | null } | null
  audioUrl: string | null
  audioDuration: number | null
  approvedAt: string | null
  previewedAt: string | null
  priority: number
  minGapMinutes: number
  graceMinutes: number
  windowStart: string | null
  windowEnd: string | null
  activeFrom: string | null
  activeTo: string | null
  errorMessage: string | null
  sources: Array<{
    id: string
    url: string
    publisher: string | null
    title: string | null
    publishedAt: string | null
    guid: string | null
    excerpt: string | null
  }>
  rules: Array<{
    id: string
    kind: NewsRuleKind
    config: NewsRuleConfig
    days: number[] | null
    active: boolean
  }>
  nextEmissionAt: string | null
  createdAt: string
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function serializeCapsule(
  capsule: {
    id: string
    title: string
    status: string
    summary: string | null
    scriptIntro: string | null
    scriptBody: string | null
    scriptClosing: string | null
    sourceText: string | null
    musicTrackId: string | null
    audioUrl: string | null
    audioDuration: number | null
    approvedAt: Date | null
    previewedAt: Date | null
    priority: number
    minGapMinutes: number
    graceMinutes: number
    windowStart: string | null
    windowEnd: string | null
    activeFrom: Date | null
    activeTo: Date | null
    errorMessage: string | null
    createdAt: Date
    musicTrack?: { id: string; name: string; artist: string | null } | null
    sources?: Array<{
      id: string
      url: string
      publisher: string | null
      title: string | null
      publishedAt: Date | null
      guid: string | null
      excerpt: string | null
    }>
    rules?: Array<{ id: string; kind: string; config: string; days: string | null; active: boolean }>
  },
  options: { lastPlayedAt?: Date | null; timezone?: string } = {}
): SerializedNewsCapsule {
  const rules: NewsRuleData[] = (capsule.rules || []).map((rule) => ({
    id: rule.id,
    kind: rule.kind as NewsRuleKind,
    config: parseJson<NewsRuleConfig>(rule.config, {}),
    days: parseJson<number[] | null>(rule.days, null),
    active: rule.active,
  }))
  const schedule: NewsCapsuleScheduleData = {
    id: capsule.id,
    title: capsule.title,
    status: capsule.status,
    priority: capsule.priority,
    minGapMinutes: capsule.minGapMinutes,
    graceMinutes: capsule.graceMinutes,
    windowStart: capsule.windowStart,
    windowEnd: capsule.windowEnd,
    activeFrom: capsule.activeFrom,
    activeTo: capsule.activeTo,
    rules,
    lastPlayedAt: options.lastPlayedAt ?? null,
  }
  const timezone = options.timezone || 'UTC'
  const next = nextEmissionAt(schedule, new Date(), timezone)

  return {
    id: capsule.id,
    title: capsule.title,
    status: (NEWS_CAPSULE_STATUSES as readonly string[]).includes(capsule.status)
      ? (capsule.status as NewsCapsuleStatus)
      : 'draft',
    summary: capsule.summary,
    scriptIntro: capsule.scriptIntro,
    scriptBody: capsule.scriptBody,
    scriptClosing: capsule.scriptClosing,
    sourceText: capsule.sourceText,
    musicTrackId: capsule.musicTrackId,
    musicTrack: capsule.musicTrack || null,
    audioUrl: capsule.audioUrl,
    audioDuration: capsule.audioDuration,
    approvedAt: capsule.approvedAt?.toISOString() || null,
    previewedAt: capsule.previewedAt?.toISOString() || null,
    priority: capsule.priority,
    minGapMinutes: capsule.minGapMinutes,
    graceMinutes: capsule.graceMinutes,
    windowStart: capsule.windowStart,
    windowEnd: capsule.windowEnd,
    activeFrom: capsule.activeFrom?.toISOString() || null,
    activeTo: capsule.activeTo?.toISOString() || null,
    errorMessage: capsule.errorMessage,
    sources: (capsule.sources || []).map((source) => ({
      id: source.id,
      url: source.url,
      publisher: source.publisher,
      title: source.title,
      publishedAt: source.publishedAt?.toISOString() || null,
      guid: source.guid,
      excerpt: source.excerpt,
    })),
    rules: rules.map((rule) => ({
      id: rule.id,
      kind: rule.kind,
      config: rule.config,
      days: rule.days || null,
      active: rule.active,
    })),
    nextEmissionAt: next?.toISOString() || null,
    createdAt: capsule.createdAt.toISOString(),
  }
}

export async function loadCapsuleForClient(id: string, clientId: string) {
  return prisma.newsCapsule.findFirst({
    where: { id, clientId },
    include: {
      sources: { orderBy: { createdAt: 'asc' } },
      rules: { orderBy: { createdAt: 'asc' } },
      musicTrack: { select: { id: true, name: true, artist: true } },
    },
  })
}

export async function getClientTimezone(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { timezone: true } })
  return client?.timezone || 'UTC'
}

export async function getLastPlayedMap(capsuleIds: string[]): Promise<Map<string, Date>> {
  if (capsuleIds.length === 0) return new Map()
  const runs = await prisma.newsCapsuleRun.findMany({
    where: { capsuleId: { in: capsuleIds }, status: 'played' },
    orderBy: { playedAt: 'desc' },
    select: { capsuleId: true, playedAt: true },
  })
  const map = new Map<string, Date>()
  for (const run of runs) {
    if (run.playedAt && !map.has(run.capsuleId)) map.set(run.capsuleId, run.playedAt)
  }
  return map
}

export function musicTrackWhere(clientId: string, musicTrackId: string) {
  return {
    id: musicTrackId,
    active: true,
    OR: [{ clientId: null }, { clientId }],
  }
}

export async function resolveMusicBuffer(
  clientId: string,
  musicTrackId: string | null | undefined
): Promise<{ buffer: Buffer; track: { id: string; name: string; artist: string | null } } | null> {
  if (!musicTrackId) return null
  const track = await prisma.musicTrack.findFirst({
    where: musicTrackWhere(clientId, musicTrackId),
    select: { id: true, name: true, artist: true, url: true },
  })
  if (!track) {
    throw new Error('La música seleccionada no está disponible para este cliente.')
  }
  const buffer = await fs
    .readFile(path.join(process.cwd(), 'public', 'uploads', 'music', path.basename(track.url)))
    .catch(() => null)
  if (!buffer) throw new Error('No se encontró el archivo de la música seleccionada.')
  return { buffer, track: { id: track.id, name: track.name, artist: track.artist } }
}

export async function deleteCapsuleAudio(audioUrl: string | null) {
  if (!audioUrl) return
  const base = path.basename(audioUrl)
  await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'news-capsules', base)).catch(() => {})
}

export function parseRuleInput(raw: unknown): Array<{
  kind: NewsRuleKind
  config: NewsRuleConfig
  days: number[] | null
  active: boolean
}> {
  if (!Array.isArray(raw)) throw new Error('Las reglas deben ser una lista.')
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Regla inválida.')
    const record = entry as Record<string, unknown>
    const kind = record.kind
    if (kind !== 'tracks' && kind !== 'times' && kind !== 'interval_hours') {
      throw new Error('Tipo de regla inválido.')
    }
    const rawConfig = record.config && typeof record.config === 'object'
      ? (record.config as Record<string, unknown>)
      : {}
    const config: NewsRuleConfig = {}
    if (kind === 'tracks') {
      const everyTracks = Number(rawConfig.everyTracks)
      if (!Number.isInteger(everyTracks) || everyTracks < 1 || everyTracks > 50) {
        throw new Error('La regla por temas debe ser entre 1 y 50.')
      }
      config.everyTracks = everyTracks
    }
    if (kind === 'times') {
      const times = Array.isArray(rawConfig.times)
        ? rawConfig.times.filter((value): value is string => typeof value === 'string')
        : []
      if (times.length === 0 || times.length > 12 || times.some((value) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
        throw new Error('Las horas deben tener formato HH:mm (máximo 12).')
      }
      config.times = times
    }
    if (kind === 'interval_hours') {
      const everyHours = Number(rawConfig.everyHours)
      if (!Number.isInteger(everyHours) || everyHours < 1 || everyHours > 24) {
        throw new Error('El intervalo debe ser entre 1 y 24 horas.')
      }
      config.everyHours = everyHours
      if (typeof rawConfig.startAt === 'string' && rawConfig.startAt) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rawConfig.startAt)) {
          throw new Error('La hora de inicio debe tener formato HH:mm.')
        }
        config.startAt = rawConfig.startAt
      }
    }
    const days = Array.isArray(record.days)
      ? record.days
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
      : null
    return { kind, config, days, active: record.active !== false }
  })
}
