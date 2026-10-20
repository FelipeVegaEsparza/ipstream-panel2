import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 4 * 1024 * 1024
const TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file_required' }, { status: 400 })
    }
    const type = typeof file.type === 'string' ? file.type.toLowerCase() : ''
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
    }
    const originalName = typeof file.name === 'string' ? file.name.toLowerCase() : ''
    const ext = TYPES[type] ||
      (/\.jpe?g$/.test(originalName) ? '.jpg' : /\.png$/.test(originalName) ? '.png' : /\.webp$/.test(originalName) ? '.webp' : '')
    if (!ext) {
      return NextResponse.json({ error: 'invalid_type' }, { status: 415 })
    }
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'live-covers', ctx.clientId)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ url: `/api/uploads/live-covers/${ctx.clientId}/${name}` })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[live/cover]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
