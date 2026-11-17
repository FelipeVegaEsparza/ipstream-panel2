export function formatMetric(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return String(value)
}

export type BucketGranularity = 'hour' | 'day'

/**
 * Un bucket diario es una clave de día local (`YYYY-MM-DD`), no un instante:
 * se formatea en UTC para que el navegador no lo corra al día anterior.
 * Un bucket horario sí es un instante UTC: se formatea en la zona del cliente.
 */
export function formatBucket(
  bucket: string,
  granularity: BucketGranularity,
  locale: string,
  timeZone = 'UTC'
): string {
  if (!bucket) return ''

  if (granularity === 'day') {
    const d = new Date(`${bucket}T00:00:00.000Z`)
    if (Number.isNaN(d.getTime())) return bucket
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  }

  const d = new Date(bucket)
  if (Number.isNaN(d.getTime())) return bucket
  return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—'
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatUptime(
  airtimeSeconds: number | null | undefined,
  from: string,
  to: string
): string {
  if (airtimeSeconds === null || airtimeSeconds === undefined || !Number.isFinite(airtimeSeconds)) return '—'
  const span = (new Date(to).getTime() - new Date(from).getTime()) / 1000
  if (!span || span <= 0) return '—'
  return `${Math.min(100, Math.round((airtimeSeconds / span) * 100))}%`
}

export function formatDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined) return null
  if (!Number.isFinite(current) || !Number.isFinite(previous) || !previous) return null
  return Math.round(((current - previous) / previous) * 100)
}
