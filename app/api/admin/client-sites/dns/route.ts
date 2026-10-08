import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureBaseDns } from '@/lib/dns-provider'
import { invalidateClientSitesConfig } from '@/lib/client-sites-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/client-sites/dns — asegura el DNS base (wildcard
 * `*.dominio` apuntando a la plataforma). Idempotente.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await ensureBaseDns()
    invalidateClientSitesConfig()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 })
  }
}
