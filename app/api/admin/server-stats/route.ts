import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { streamingClient } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const stats = await streamingClient.getHostStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[admin/server-stats GET]', err)
    return NextResponse.json({ error: 'agent_unreachable' }, { status: 502 })
  }
}
