// =====================================================
// /api/admin/client-servers — clientes con su servidor y puertos
// =====================================================
// Muestra por cliente: servidor de radio/TV asignado, mount/stream key,
// URL pública y puertos (icecast, harbor, RTMP, HLS, agente).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getVideoStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      user: { select: { email: true } },
      radioStream: {
        select: {
          icecastMount: true,
          liquidsoapTelnetPort: true,
          server: { select: { id: true, name: true, type: true, baseUrl: true, publicHostname: true, publicUrl: true } },
        },
      },
      videoStream: {
        select: {
          server: { select: { id: true, name: true, type: true, baseUrl: true, publicHostname: true, publicUrl: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = clients.map((c) => {
    const radio = c.radioStream
    const video = c.videoStream

    let radioPublicUrl: string | null = null
    if (radio?.server && radio.icecastMount) {
      const base = (radio.server.publicUrl || `http://${radio.server.publicHostname}:8000`).replace(/\/+$/, '')
      radioPublicUrl = `${base}/${radio.icecastMount}`
    }
    let videoPublicUrl: string | null = null
    if (video?.server) {
      const key = getVideoStreamKey(c.id)
      const base = video.server.publicUrl
        ? video.server.publicUrl.replace(/\/+$/, '')
        : `http://${video.server.publicHostname}:8080`
      videoPublicUrl = `${base}/live/${key}.m3u8`
    }

    const hostFromBase = (baseUrl: string | null) => {
      try { return new URL(baseUrl || '').hostname } catch { return null }
    }

    return {
      clientId: c.id,
      name: c.name,
      email: c.user.email,
      radio: radio
        ? {
            serverId: radio.server?.id ?? null,
            serverName: radio.server?.name ?? 'Sin servidor asignado',
            serverType: radio.server?.type ?? null,
            agentHost: hostFromBase(radio.server?.baseUrl ?? null),
            mount: radio.icecastMount,
            telnetPort: radio.liquidsoapTelnetPort,
            harborPort: radio.liquidsoapTelnetPort ? radio.liquidsoapTelnetPort + 10000 : null,
            icecastPort: 8000,
            publicUrl: radioPublicUrl,
          }
        : null,
      video: video
        ? {
            serverId: video.server?.id ?? null,
            serverName: video.server?.name ?? 'Sin servidor asignado',
            serverType: video.server?.type ?? null,
            agentHost: hostFromBase(video.server?.baseUrl ?? null),
            streamKey: getVideoStreamKey(c.id),
            rtmpPort: 1935,
            hlsPort: 8080,
            publicUrl: videoPublicUrl,
          }
        : null,
    }
  })

  return NextResponse.json({ clients: rows })
}
