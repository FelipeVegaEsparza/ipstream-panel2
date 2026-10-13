// =====================================================
// Rate limit — contador compartido en MySQL
// =====================================================
// El contador vive en la tabla `rate_limits` para que el límite sea global
// entre todos los procesos worker del panel (cluster). La escritura es atómica
// (INSERT ... ON DUPLICATE KEY UPDATE) y luego se lee el valor resultante.
//
// Fail-open: si la DB falla, se permite la petición y se loguea el error, para
// no bloquear login/registro por un problema del almacén.
//
// La identidad del solicitante (IP/email) la resuelve quien llama.

import { prisma } from '@/lib/prisma'

// Limpieza perezosa: con baja probabilidad se borran las filas vencidas.
const CLEANUP_CHANCE = 0.01

async function cleanupExpired(now: Date) {
  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } })
  } catch {
    // best-effort
  }
}

export async function rateLimit(options: {
  maxRequests: number
  windowMs: number
  identifier: string
}): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + options.windowMs)
  const { maxRequests, identifier } = options

  try {
    await prisma.$executeRaw`
      INSERT INTO rate_limits (identifier, \`count\`, resetAt)
      VALUES (${identifier}, 1, ${resetAt})
      ON DUPLICATE KEY UPDATE
        \`count\` = IF(resetAt <= ${now}, 1, \`count\` + 1),
        resetAt = IF(resetAt <= ${now}, ${resetAt}, resetAt)
    `

    const row = await prisma.rateLimit.findUnique({
      where: { identifier },
      select: { count: true, resetAt: true },
    })

    if (Math.random() < CLEANUP_CHANCE) {
      void cleanupExpired(now)
    }

    if (!row) {
      // No debería pasar tras el upsert; fail-open.
      return { allowed: true, remaining: maxRequests, resetAt: resetAt.getTime() }
    }

    return {
      allowed: row.count <= maxRequests,
      remaining: Math.max(0, maxRequests - row.count),
      resetAt: row.resetAt.getTime(),
    }
  } catch (error) {
    console.error('Rate limit (DB) error, fail-open:', error)
    return { allowed: true, remaining: maxRequests, resetAt: resetAt.getTime() }
  }
}
