import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { corsHeaders, handleCors } from '@/lib/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

interface ByteRange {
  start: number
  end: number
}

function parseRange(value: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  let start: number
  let end: number

  if (rawStart === '' && rawEnd !== '') {
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart || 0)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  const file = params.file
  if (!file || file.includes('/') || file.includes('\\') || file.startsWith('.')) {
    return new NextResponse('Bad request', { status: 400, headers: corsHeaders })
  }

  const extension = file.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME_TYPES[extension]
  if (!contentType) {
    return new NextResponse('Not found', { status: 404, headers: corsHeaders })
  }

  const baseDir = path.resolve(process.cwd(), 'public', 'uploads', 'login')
  const filePath = path.resolve(baseDir, file)
  if (!filePath.startsWith(baseDir + path.sep)) {
    return new NextResponse('Forbidden', { status: 403, headers: corsHeaders })
  }

  let info
  try {
    info = await stat(filePath)
  } catch {
    return new NextResponse('Not found', { status: 404, headers: corsHeaders })
  }
  if (!info.isFile()) {
    return new NextResponse('Not found', { status: 404, headers: corsHeaders })
  }

  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    const range = parseRange(rangeHeader, info.size)
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...corsHeaders,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${info.size}`,
        },
      })
    }

    const stream = Readable.toWeb(
      createReadStream(filePath, { start: range.start, end: range.end })
    ) as ReadableStream
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${info.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': CACHE_CONTROL,
      },
    })
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Length': String(info.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': CACHE_CONTROL,
    },
  })
}
