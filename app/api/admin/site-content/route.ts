import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { normalizeLocale } from '@/lib/site-content'
import {
  SiteContentValidationError,
  SiteContentVersionError,
  getSiteContentForAdmin,
  saveSiteContent,
} from '@/lib/site-content-service'

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function localeFrom(request: NextRequest): ReturnType<typeof normalizeLocale> {
  return normalizeLocale(request.nextUrl.searchParams.get('locale'))
}

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) return { error: noStore({ error: 'No autorizado' }, 401) }
  if (session.user.role !== 'ADMIN') return { error: noStore({ error: 'No autorizado' }, 403) }
  return { session }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const data = await getSiteContentForAdmin(localeFrom(request))
    return noStore(data)
  } catch (error) {
    console.error('Error reading site content:', error)
    return noStore({ error: 'Error interno' }, 500)
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = (await request.json()) as {
      locale?: string
      version?: number
      content?: unknown
    }
    const locale = normalizeLocale(body.locale ?? localeFrom(request))
    const version = Number(body.version)

    if (!Number.isInteger(version) || version < 0) {
      return noStore({ error: 'Versión inválida' }, 400)
    }

    const data = await saveSiteContent(
      locale,
      body.content,
      version,
      auth.session!.user.email || auth.session!.user.id
    )
    return noStore(data)
  } catch (error) {
    if (error instanceof SiteContentValidationError) {
      return noStore({ error: 'Contenido inválido', issues: error.issues }, 400)
    }
    if (error instanceof SiteContentVersionError) {
      return noStore(
        {
          error: 'La versión cambió. Recarga el contenido antes de guardar.',
          currentVersion: error.currentVersion,
        },
        409
      )
    }
    console.error('Error saving site content:', error)
    return noStore({ error: 'Error interno' }, 500)
  }
}
