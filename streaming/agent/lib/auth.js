// =====================================================
// Auth — verifica que cada request viene del IPStream Panel
// =====================================================
// El panel envía: Authorization: Bearer <STREAMING_AGENT_TOKEN>
// Si el token coincide, la request pasa. Si no, 401.

import { logger } from './logger.js'

export function buildAuthHook(expectedToken, harborSecret) {
  return async function authHook(request, reply) {
    // Exento de auth: health, auth-source POST (Icecast), video hooks (SRS)
    const url = request.url.split('?')[0].replace(/\/$/, '')
    if (url === '/health' || url === '/healthz' ||
        url === '/api/streams/auth-source' ||
        url === '/api/video/hooks/on-publish' ||
        url === '/api/video/hooks/on-unpublish') {
      return
    }

    // Harbor callbacks: validan su propio token secreto (usado por Liquidsoap)
    if (url.includes('/harbor/connected') || url.includes('/harbor/disconnected')) {
      const headerToken = request.headers['x-harbor-token']
      const queryToken = request.query?.token
      if (headerToken === harborSecret) {
        return
      }
      // Deprecated fallback: query param token (will be removed in next release)
      if (queryToken === harborSecret) {
        logger.warn({ url: request.url.split('?')[0] }, 'Harbor callback usando query-param token (deprecated)')
        return
      }
      reply.code(401).send({ error: 'unauthorized', message: 'Harbor callback token inválido' })
      return reply
    }

    const auth = request.headers.authorization || ''
    const [scheme, token] = auth.split(' ')

    if (scheme !== 'Bearer' || !token) {
      reply.code(401).send({ error: 'unauthorized', message: 'Falta Authorization Bearer' })
      return reply
    }

    if (token !== expectedToken) {
      reply.code(401).send({ error: 'unauthorized', message: 'Token inválido' })
      return reply
    }
  }
}
