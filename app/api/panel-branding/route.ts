import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await prisma.appConfig.findFirst({
    select: { panelLogoDarkUrl: true, panelLogoLightUrl: true },
  })
  return NextResponse.json(
    {
      logoDarkUrl: config?.panelLogoDarkUrl || null,
      logoLightUrl: config?.panelLogoLightUrl || null,
    },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
  )
}
