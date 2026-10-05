import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { resolveVideoServerTarget } from '@/lib/streaming-servers'

// =====================================================
// /vod/<streamKey>/seg/<trackId>/<file> — segmentos .ts del stitcher
// Público (sin auth), gateado por streamKey. Proxea el binario del agente.
// =====================================================

function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string; track: string; file: string } },
) {
  const streamKey = params.key || ''
  const { track, file } = params
  if (!/^tv_[a-f0-9]{12}$/.test(streamKey)) return new NextResponse('Not Found', { status: 404 })
  if (!/^[a-zA-Z0-9-]+$/.test(track) || !/^[a-zA-Z0-9._-]+$/.test(file)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const streams = await prisma.videoStream.findMany({ select: { clientId: true } })
  const match = streams.find((s) => getStreamKey(s.clientId) === streamKey)
  if (!match) return new NextResponse('Not Found', { status: 404 })

  const target = await resolveVideoServerTarget(match.clientId)
  if (!target) return new NextResponse('Bad Gateway', { status: 502 })

  let res: Response
  try {
    res = await fetch(
      `${target.baseUrl}/api/video/playout/${streamKey}/seg/${encodeURIComponent(track)}/${encodeURIComponent(file)}`,
      { headers: { Authorization: `Bearer ${target.token}` } },
    )
  } catch {
    return new NextResponse('Bad Gateway', { status: 502 })
  }
  if (!res.ok || !res.body) return new NextResponse(null, { status: res.status })

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'video/mp2t',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
