import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { resolveVideoServerTarget } from '@/lib/streaming-servers'

// =====================================================
// /vod/<streamKey>/live/<rendition>.m3u8 — manifiesto vivo por rendición (ABR)
// Público (sin auth), gateado por streamKey. Proxea al agente del nodo y
// reescribe las URIs de segmentos a /vod/<key>/seg/... (mismo origen).
// =====================================================

function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string; rendition: string } },
) {
  const streamKey = (params.key || '').replace(/\.m3u8$/, '')
  const rendition = (params.rendition || '').replace(/\.m3u8$/, '')
  if (!/^tv_[a-f0-9]{12}$/.test(streamKey) || !/^[a-zA-Z0-9-]+$/.test(rendition)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const streams = await prisma.videoStream.findMany({ select: { clientId: true, status: true } })
  const match = streams.find((s) => getStreamKey(s.clientId) === streamKey)
  if (!match) return new NextResponse('Not Found', { status: 404 })
  if (match.status === 'off') return new NextResponse('Not Found', { status: 404 })

  const target = await resolveVideoServerTarget(match.clientId)
  if (!target) return new NextResponse('Bad Gateway', { status: 502 })

  let res: Response
  try {
    res = await fetch(
      `${target.baseUrl}/api/video/playout/${streamKey}/live/${encodeURIComponent(rendition)}.m3u8`,
      { headers: { Authorization: `Bearer ${target.token}` }, cache: 'no-store' },
    )
  } catch {
    return new NextResponse('Bad Gateway', { status: 502 })
  }
  if (!res.ok) return new NextResponse(null, { status: res.status })

  let text = await res.text()
  text = text.replace(
    new RegExp(`/api/video/playout/${streamKey}/seg/`, 'g'),
    `/vod/${streamKey}/seg/`,
  )

  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
