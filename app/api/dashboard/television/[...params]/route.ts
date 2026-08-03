import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'

const AGENT_URL = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
const AGENT_TOKEN = process.env.STREAMING_AGENT_TOKEN || ''

const PATH_MAP: Record<string, (clientId: string) => string> = {
  'status': (id) => `/api/video/${id}/status`,
  'connection': (id) => `/api/video/dj-status/${id}`,
  'tracks': (id) => `/api/video/${id}/tracks`,
  'playlists': (id) => `/api/video/${id}/playlists`,
  'folders': (id) => `/api/video/${id}/folders`,
  'storage': (id) => `/api/video/${id}/storage`,
  'history': (id) => `/api/video/${id}/history`,
  'encoders': () => `/api/video/encoders`,
  'thumbnails': (id) => `/api/video/${id}/thumbnails`,
}

async function proxyToAgent(targetPath: string, method: string, headersIn: Record<string, string>, body: any) {
  const target = `${AGENT_URL}${targetPath}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AGENT_TOKEN}`,
  }

  // Only forward Content-Type when there's a body
  if (body !== undefined && body !== null) {
    Object.assign(headers, headersIn)
  }

  const opts: any = { method, headers }
  if (body !== undefined && body !== null) {
    opts.body = body
    opts.duplex = 'half'
  }

  const res = await fetch(target, opts)

  // Thumbnails: return binary response directly
  if (targetPath.includes('/thumbnails/')) {
    const blob = await res.blob()
    return new NextResponse(blob, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // JSON: parse and rewrite thumbnail URLs
  const text = await res.text()
  let json: any = null
  if (text) {
    try { json = JSON.parse(text) } catch { json = text }
  }

  // Rewrite thumbnail URLs to go through dashboard proxy
  if (json && typeof json === 'object') {
    const rewriteThumb = (obj: any) => {
      if (!obj || typeof obj !== 'object') return
      if (Array.isArray(obj)) { obj.forEach(rewriteThumb); return }
      if (obj.thumbnail && typeof obj.thumbnail === 'string' && obj.thumbnail.startsWith('/api/video/')) {
        obj.thumbnail = obj.thumbnail.replace(/^\/api\/video\/[^/]+\/thumbnails\//, '/api/dashboard/television/thumbnails/')
      }
      for (const key of Object.keys(obj)) {
        if (key !== 'thumbnail') rewriteThumb(obj[key])
      }
    }
    rewriteThumb(json)
  }

  return NextResponse.json(json, { status: res.status })
}

async function handleRequest(req: NextRequest, { params }: { params: { params: string[] } }) {
  try {
    const ctx = await requireStreamingClient()
    const segments = params.params

    // Validar segmentos contra path/URL escape antes de concatenarlos a la URL del agente
    for (const segment of segments) {
      let decoded: string
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        return NextResponse.json({ error: 'Invalid path segment' }, { status: 400 })
      }
      if (
        !decoded ||
        decoded === '.' ||
        decoded === '..' ||
        !/^[a-zA-Z0-9._-]+$/.test(decoded)
      ) {
        return NextResponse.json({ error: 'Invalid path segment' }, { status: 400 })
      }
    }

    // Leer body una sola vez
    const contentType = req.headers.get('content-type') || ''
    let body: any = undefined
    let headersOut: Record<string, string> = {}
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        body = await req.blob()
        headersOut['Content-Type'] = contentType
      } else {
        const text = await req.text()
        body = text || undefined
        if (body) headersOut['Content-Type'] = 'application/json'
      }
    }

    if (segments[0] === 'control') {
      const json = body ? JSON.parse(body) : {}
      let targetPath: string
      if (json.action === 'start') targetPath = `/api/video/${ctx.clientId}/start`
      else if (json.action === 'stop') targetPath = `/api/video/${ctx.clientId}/stop`
      else if (json.action === 'shuffle') targetPath = `/api/video/${ctx.clientId}/shuffle`
      else return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

      // Control actions are POST with no additional body needed
      return proxyToAgent(targetPath, 'POST', headersOut, undefined)
    }

    // Resolve path
    const base = segments[0]
    const mapper = PATH_MAP[base]
    let targetPath: string
    if (mapper) {
      targetPath = mapper(ctx.clientId)
      if (segments.length > 1) targetPath += '/' + segments.slice(1).join('/')
    } else {
      targetPath = `/api/video/${ctx.clientId}/${segments.join('/')}`
    }

    return proxyToAgent(targetPath, req.method, headersOut, body)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[television proxy]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
