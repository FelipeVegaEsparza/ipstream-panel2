// =====================================================
// Auth — verifica que cada request viene del IPStream Panel
// =====================================================
// El panel envía: Authorization: Bearer <STREAMING_AGENT_TOKEN>
// Si el token coincide, la request pasa. Si no, 401.

export function buildAuthHook(expectedToken) {
  return async function authHook(request, reply) {
    // Permitir health check y auth-source sin token (Icecast llama auth-source)
    if (request.url === '/health' || request.url === '/healthz' || request.url === '/api/streams/auth-source') {
      return
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
