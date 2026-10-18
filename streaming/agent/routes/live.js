// =====================================================
// Live Console — ingesta WebRTC/WebSocket y sesión
// =====================================================

import { spawn } from 'child_process'
import { config } from '../lib/config.js'
import { logger } from '../lib/logger.js'
import { pool } from '../lib/db.js'
import { updateMetadata } from '../lib/icecast.js'
import { bearerToken, verifyLiveToken } from '../lib/live-token.js'
import {
  createSession,
  endSession,
  getRecentEndReason,
  getSession,
  touchSession,
} from '../lib/live-sessions.js'
import { startBridge, writeBridgeChunk } from '../lib/live-bridge.js'

const SRS_HTTP = `http://${config.srs.host}:${config.srs.httpPort}`

function tokenFrom(request) {
  const protocol = request.headers['sec-websocket-protocol']
  const fromProtocol = typeof protocol === 'string' ? protocol.split(',')[0].trim() : null
  return (
    bearerToken(request) ||
    fromProtocol ||
    (typeof request.query?.token === 'string' ? request.query.token : null)
  )
}

function validateSession(request, expectedTransport) {
  const payload = verifyLiveToken(tokenFrom(request))
  if (!payload) return { error: 'invalid_token', status: 401 }
  if (payload.transport !== expectedTransport) return { error: 'wrong_transport', status: 401 }
  const stream = typeof request.query?.stream === 'string' ? request.query.stream : payload.sid
  if (stream !== payload.sid) return { error: 'stream_mismatch', status: 401 }
  return { payload, stream }
}

function srsPath(path, stream) {
  const url = new URL(path, SRS_HTTP)
  // SRS redirige /rtc/v1/whip -> /rtc/v1/whip/ con 302. Node fetch seguiría
  // el redirect como GET y perdería el SDP. Usamos siempre la ruta final.
  if (url.pathname === '/rtc/v1/whip') url.pathname = '/rtc/v1/whip/'
  url.searchParams.set('app', 'radio')
  url.searchParams.set('stream', stream)
  return url
}

function rewriteLocation(location) {
  if (!location) return null
  try {
    const url = new URL(location)
    return `${url.pathname}${url.search}`
  } catch {
    return location
  }
}

export default async function liveRoutes(app) {
  // --------------------------------------------------
  // Proxy WHIP autenticado hacia SRS
  // --------------------------------------------------
  app.options('/rtc/*', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*')
    reply.header('Access-Control-Allow-Headers', 'authorization, content-type, accept')
    reply.header('Access-Control-Allow-Methods', 'POST, PATCH, DELETE, OPTIONS')
    return reply.code(204).send()
  })

  app.route({
    method: ['POST', 'PATCH', 'DELETE'],
    url: '/rtc/*',
    handler: async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*')
    reply.header('Access-Control-Allow-Headers', 'authorization, content-type, accept')
    reply.header('Access-Control-Allow-Methods', 'POST, PATCH, DELETE, OPTIONS')
    reply.header('Vary', 'Origin')

    const transport = 'whip'
    const validated = validateSession(request, transport)
    if (validated.error) {
      return reply.code(validated.status).send({ error: validated.error })
    }

    const { payload, stream } = validated
    let session = getSession(payload.sid)
    if (request.method === 'POST') {
      if (!session) {
        try {
          session = createSession(payload)
        } catch (err) {
          return reply.code(err.statusCode || 409).send({
            error: 'slot_busy',
            message: err.message,
          })
        }
      } else {
        touchSession(payload.sid)
      }
    } else if (!session) {
      return reply.code(404).send({ error: 'session_not_found' })
    }

    const target = srsPath(request.url, stream)
    const headers = {
      'Content-Type': request.headers['content-type'] || 'application/sdp',
      'Accept': request.headers.accept || 'application/sdp',
    }
    if (request.headers.origin) headers.Origin = request.headers.origin

    try {
      const res = await fetch(target, {
        method: request.method,
        headers,
        body: ['POST', 'PATCH'].includes(request.method) ? request.body : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      })
      const body = await res.text()
      const location = res.headers.get('location')
      reply.code(res.status)
      reply.header('Content-Type', res.headers.get('content-type') || 'application/sdp')
      const rewritten = rewriteLocation(location)
      if (rewritten) reply.header('Location', rewritten)

      if (request.method === 'DELETE') {
        await endSession(session)
      }

      return reply.send(body)
    } catch (err) {
      logger.error({ err: err.message, sessionId: payload.sid }, 'WHIP proxy falló')
      return reply.code(502).send({ error: 'whip_upstream_failed', message: err.message })
    }
    },
  })

  // --------------------------------------------------
  // Ingesta WebSocket (fallback)
  // --------------------------------------------------
  app.get('/ws/live', { websocket: true }, async (socket, request) => {
    const payload = verifyLiveToken(tokenFrom(request))
    if (!payload || payload.transport !== 'websocket') {
      socket.close(4401, 'unauthorized')
      return
    }
    const requested = typeof request.query?.session === 'string' ? request.query.session : payload.sid
    if (requested !== payload.sid) {
      socket.close(4401, 'session mismatch')
      return
    }

    let session = getSession(payload.sid)
    if (!session) session = createSession(payload)
    else touchSession(payload.sid)
    session.close = () => {
      try { socket.close(1000, 'ended') } catch {}
    }
    session.closeWithReason = (reason) => {
      try { socket.close(4410, reason) } catch {}
    }

    try {
      await startBridge(session, 'websocket')
    } catch (err) {
      logger.error({ err: err.message, sessionId: payload.sid }, 'No se pudo iniciar el puente WebSocket')
      socket.close(1011, 'bridge failed')
      await endSession(session)
      return
    }

    socket.send(JSON.stringify({ type: 'ready', sessionId: payload.sid }))

    socket.on('message', (data, isBinary) => {
      if (!isBinary) {
        try {
          const message = JSON.parse(data.toString())
          if (message?.type === 'end') {
            socket.close(1000, 'ended by client')
          } else if (message?.type === 'now-playing') {
            // La metadata se envía por el panel; aceptamos el ping y seguimos.
          }
        } catch {
          // Mensaje de texto no reconocido.
        }
        return
      }
      touchSession(payload.sid)
      writeBridgeChunk(session, data)
    })

    socket.on('close', async () => {
      await endSession(session)
    })
    socket.on('error', (err) => {
      logger.warn({ err: err.message, sessionId: payload.sid }, 'WebSocket live error')
    })
  })

  // --------------------------------------------------
  // Piper TTS — locuciones de clima/hora
  // --------------------------------------------------
  app.post('/api/live/tts', async (request, reply) => {
    const text = typeof request.body?.text === 'string'
      ? request.body.text.trim().slice(0, 500)
      : ''
    if (!text) return reply.code(400).send({ error: 'text_required' })

    const tmp = `/tmp/tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const script = [
      `trap 'rm -f "${tmp}.wav" "${tmp}.txt"' EXIT`,
      `cat > "${tmp}.txt"`,
      `${config.live.ttsBin} --model ${config.live.ttsModel} --output_file "${tmp}.wav" < "${tmp}.txt" >/dev/null 2>&1`,
      `cat "${tmp}.wav"`,
    ].join('; ')

    return new Promise((resolve) => {
      let finished = false
      let timer = null
      const chunks = []
      const errors = []
      let errorBytes = 0

      const child = spawn(
        'docker',
        ['exec', '-i', config.live.ttsContainer, 'sh', '-c', script],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      )

      const finish = (send) => {
        if (finished) return
        finished = true
        if (timer) clearTimeout(timer)
        resolve(send())
      }

      timer = setTimeout(() => {
        try { child.kill('SIGKILL') } catch {}
        finish(() => reply.code(504).send({ error: 'tts_timeout', message: 'La locución tardó demasiado' }))
      }, 25000)

      child.stdout.on('data', (chunk) => chunks.push(chunk))
      child.stderr.on('data', (chunk) => {
        if (errorBytes < 4000) {
          errors.push(chunk)
          errorBytes += chunk.length
        }
      })
      child.on('error', (err) => {
        finish(() => reply.code(502).send({ error: 'tts_failed', message: err.message }))
      })
      child.on('close', (code) => {
        finish(() => {
          const audio = Buffer.concat(chunks)
          if (code !== 0 || audio.length < 44) {
            const detail = Buffer.concat(errors).toString('utf8').slice(0, 300)
            logger.warn({ code, detail }, 'Piper TTS falló')
            return reply.code(502).send({
              error: 'tts_failed',
              message: 'No se pudo generar la locución',
            })
          }
          reply.header('Cache-Control', 'no-store')
          return reply.type('audio/wav').send(audio)
        })
      })

      child.stdin.end(text)
    })
  })

  // --------------------------------------------------
  // Heartbeat / end / metadata (panel -> agente)
  // --------------------------------------------------
  app.post('/api/live/session/heartbeat', async (request, reply) => {
    const { sessionId, clientId, end } = request.body || {}
    if (!sessionId) return reply.code(400).send({ error: 'session_id_required' })
    const session = touchSession(sessionId)
    if (!session) {
      const reason = getRecentEndReason(sessionId)
      if (reason) return { ok: false, reason }
      return reply.code(404).send({ error: 'session_not_found' })
    }
    if (clientId && session.clientId !== clientId) {
      return reply.code(403).send({ error: 'session_client_mismatch' })
    }
    if (end) {
      await endSession(session)
      return { ok: true, state: 'ended' }
    }
    return { ok: true, state: session.transport }
  })

  app.post('/api/live/session/end', async (request, reply) => {
    const { sessionId, clientId } = request.body || {}
    if (!sessionId) return reply.code(400).send({ error: 'session_id_required' })
    const session = getSession(sessionId)
    if (!session) return { ok: true }
    if (clientId && session.clientId !== clientId) {
      return reply.code(403).send({ error: 'session_client_mismatch' })
    }
    await endSession(session)
    return { ok: true }
  })

  app.post('/api/live/session/now-playing', async (request, reply) => {
    const { sessionId, clientId, title, artist, nextTitle, nextArtist } = request.body || {}
    if (!sessionId) return reply.code(400).send({ error: 'session_id_required' })
    const session = getSession(sessionId)
    if (!session) return reply.code(404).send({ error: 'session_not_found' })
    if (clientId && session.clientId !== clientId) {
      return reply.code(403).send({ error: 'session_client_mismatch' })
    }

    const clean = (value) => (typeof value === 'string' ? value.trim().slice(0, 300) : null)
    const safeTitle = clean(title)
    const safeArtist = clean(artist)

    await pool.query(
      `UPDATE radio_streams
          SET currentTitle = ?, currentArtist = ?, updatedAt = NOW()
        WHERE clientId = ?`,
      [safeTitle, safeArtist, session.clientId]
    )

    if (safeTitle) {
      const song = safeArtist ? `${safeArtist} - ${safeTitle}` : safeTitle
      try {
        await updateMetadata(String(session.mount).replace(/^\/+/, ''), song)
      } catch (err) {
        logger.debug({ err: err.message, sessionId }, 'No se pudo actualizar metadata de Icecast')
      }
    }

    return { ok: true, nextTitle: clean(nextTitle), nextArtist: clean(nextArtist) }
  })
}
