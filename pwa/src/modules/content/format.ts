import type { FullClientData } from '@/core/types'

export interface SectionDataProps {
  clientData: FullClientData | undefined
  isLoading: boolean
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatDuration(minutes: unknown): string {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return ''
  const total = Math.floor(value)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}

/** Devuelve el número si es finito, o null si no lo es (evita "NaN"). */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Metadata segura de episodios (temporada/episodio/duración) sin "NaN". */
export function episodeMeta(
  season: unknown,
  episodeNumber: unknown,
  duration: unknown
): string {
  const parts: string[] = []
  const seasonN = toFiniteNumber(season)
  const episodeN = toFiniteNumber(episodeNumber)
  if (seasonN !== null) parts.push(`Temporada ${seasonN}`)
  if (episodeN !== null) parts.push(`Ep. ${episodeN}`)
  const dur = formatDuration(duration)
  if (dur) parts.push(dur)
  return parts.join(' · ')
}

export function formatTime(time: string | undefined): string {
  return time ?? ''
}
