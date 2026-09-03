export interface GeocodeResult {
  id: number
  city: string
  region: string | null
  country: string
  countryCode: string
  latitude: number
  longitude: number
}

interface OpenMeteoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code?: string
  country?: string
  admin1?: string | null
  admin2?: string | null
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[]
}

export async function searchCity(query: string, count = 8): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', q)
  url.searchParams.set('count', String(count))
  url.searchParams.set('language', 'es')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    const data = (await res.json()) as OpenMeteoResponse
    return (data.results ?? []).map((r) => ({
      id: r.id,
      city: r.name,
      region: r.admin1 ?? r.admin2 ?? null,
      country: r.country ?? r.country_code ?? '',
      countryCode: r.country_code ?? '',
      latitude: r.latitude,
      longitude: r.longitude,
    }))
  } catch (error) {
    console.error('Geocoding search error:', error)
    return []
  }
}
