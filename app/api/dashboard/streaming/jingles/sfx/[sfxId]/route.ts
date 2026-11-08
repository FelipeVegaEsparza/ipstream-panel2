import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { isJingleSfxId, sfxFile } from '@/lib/jingle-sfx'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { sfxId: string } }
) {
  if (!isJingleSfxId(params.sfxId)) {
    return NextResponse.json({ error: 'invalid_sfx' }, { status: 404 })
  }
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), 'public', 'audio', 'jingle-fx', sfxFile(params.sfxId))
    )
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'sfx_not_found' }, { status: 404 })
  }
}
