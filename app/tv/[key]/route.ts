import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Stream key derivado igual que en el agente: tv_ + sha256(clientId).slice(0,12)
function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

// URL pública estable: /tv/<streamKey>.m3u8 → redirige al app que esté al aire
// (dj/ cuando el DJ/OBS está en vivo, live/ para AutoDJ). Así una sola URL
// sirve siempre la señal actual, sin depender de saber qué app se usa.
export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const rawKey = params.key || ''
  const streamKey = rawKey.replace(/\.m3u8$/, '')
  if (!/^tv_[a-f0-9]{12}$/.test(streamKey)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const streams = await prisma.videoStream.findMany({ select: { clientId: true, status: true } })
  const match = streams.find(s => getStreamKey(s.clientId) === streamKey)
  if (!match) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const app = match.status === 'live' ? 'dj' : 'live'
  const location = `/${app}/${streamKey}.m3u8`
  const res = NextResponse.redirect(new URL(location, _req.url), 302)
  res.headers.set('Cache-Control', 'no-store')
  return res
}