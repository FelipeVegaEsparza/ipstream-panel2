import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { searchCity } from '@/lib/geocode'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchCity(q)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error geocoding:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
