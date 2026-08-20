import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

// Estado público del app al aire para el player: /tv/<key>/app → { app }
export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const streamKey = (params.key || '').replace(/\.m3u8$/, '')
  if (!/^tv_[a-f0-9]{12}$/.test(streamKey)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const streams = await prisma.videoStream.findMany({ select: { clientId: true, status: true } })
  const match = streams.find(s => getStreamKey(s.clientId) === streamKey)
  if (!match) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  return NextResponse.json(
    { app: match.status === 'live' ? 'dj' : 'live' },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}