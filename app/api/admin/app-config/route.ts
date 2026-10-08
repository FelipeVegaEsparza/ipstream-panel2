import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, isEncrypted } from '@/lib/encryption'
import { invalidateClientSitesConfig } from '@/lib/client-sites-config'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: { enableGenericNews: false }
      })
    }

    // Config de sitios: valor efectivo (DB o env). El token nunca se devuelve.
    return NextResponse.json({
      enableGenericNews: config.enableGenericNews,
      adminNotifyEmail: config.adminNotifyEmail,
      trialDays: config.trialDays,
      clientSitesDomain: config.clientSitesDomain || process.env.CLIENT_SITES_DOMAIN || '',
      clientSitesTarget: config.clientSitesTarget || process.env.CLIENT_SITES_TARGET || '',
      clientSitesIp: config.clientSitesIp || process.env.CLIENT_SITES_IP || '',
      cloudflareTokenSet: Boolean(config.cloudflareApiTokenEnc || process.env.CLOUDFLARE_API_TOKEN),
    })
  } catch (error) {
    console.error('Error getting app config:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      enableGenericNews,
      adminNotifyEmail,
      trialDays,
      clientSitesDomain,
      clientSitesTarget,
      clientSitesIp,
      cloudflareApiToken,
    } = body

    let trialDaysValue: number | undefined
    if (trialDays !== undefined) {
      const parsed = Number(trialDays)
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
        return NextResponse.json({ error: 'trialDays debe ser un entero entre 0 y 365' }, { status: 400 })
      }
      trialDaysValue = parsed
    }

    // Token: si viene definido, se guarda (encriptado) o se limpia si es vacío.
    // Si no viene, se deja como está.
    let tokenUpdate: { cloudflareApiTokenEnc: string | null } | undefined
    if (cloudflareApiToken !== undefined) {
      const raw = typeof cloudflareApiToken === 'string' ? cloudflareApiToken.trim() : ''
      tokenUpdate = { cloudflareApiTokenEnc: raw ? encrypt(raw) : null }
    }

    const sitesData = {
      ...(clientSitesDomain !== undefined ? { clientSitesDomain: clientSitesDomain?.trim() || null } : {}),
      ...(clientSitesTarget !== undefined ? { clientSitesTarget: clientSitesTarget?.trim() || null } : {}),
      ...(clientSitesIp !== undefined ? { clientSitesIp: clientSitesIp?.trim() || null } : {}),
      ...(tokenUpdate || {}),
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          enableGenericNews: enableGenericNews ?? false,
          adminNotifyEmail: adminNotifyEmail ?? null,
          ...(trialDaysValue !== undefined ? { trialDays: trialDaysValue } : {}),
          ...sitesData,
        },
      })
    } else {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data: {
          ...(enableGenericNews !== undefined ? { enableGenericNews } : {}),
          ...(adminNotifyEmail !== undefined ? { adminNotifyEmail: adminNotifyEmail || null } : {}),
          ...(trialDaysValue !== undefined ? { trialDays: trialDaysValue } : {}),
          ...sitesData,
        },
      })
    }

    invalidateClientSitesConfig()

    return NextResponse.json({
      enableGenericNews: config.enableGenericNews,
      adminNotifyEmail: config.adminNotifyEmail,
      trialDays: config.trialDays,
      clientSitesDomain: config.clientSitesDomain || process.env.CLIENT_SITES_DOMAIN || '',
      clientSitesTarget: config.clientSitesTarget || process.env.CLIENT_SITES_TARGET || '',
      clientSitesIp: config.clientSitesIp || process.env.CLIENT_SITES_IP || '',
      cloudflareTokenSet: Boolean(config.cloudflareApiTokenEnc || process.env.CLOUDFLARE_API_TOKEN),
    })
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
