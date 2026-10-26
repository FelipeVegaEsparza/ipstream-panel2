export function formatAiNumber(value: number, locale: 'es' | 'en'): string {
  return Math.max(0, Math.round(value)).toLocaleString(
    locale === 'en' ? 'en-US' : 'es-CL'
  )
}

export function formatAiMusic(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

export function formatAiPeriod(period: string, locale: 'es' | 'en'): string {
  try {
    const date = new Date(`${period}-01T00:00:00Z`)
    if (Number.isNaN(date.getTime())) return period
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return period
  }
}
