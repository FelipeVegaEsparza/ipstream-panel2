const rateMap = new Map<string, { count: number; resetAt: number }>()

const MAX_ENTRIES = 10000
const CLEANUP_CHANCE = 0.01

function cleanup(now: number) {
  for (const [key, record] of rateMap) {
    if (now > record.resetAt) {
      rateMap.delete(key)
    }
  }
}

function enforceSizeLimit(now: number) {
  if (rateMap.size <= MAX_ENTRIES) return
  cleanup(now)
  if (rateMap.size <= MAX_ENTRIES) return
  // Si aún excede, eliminar la entrada más antigua
  const oldest = rateMap.keys().next().value
  if (oldest !== undefined) {
    rateMap.delete(oldest)
  }
}

export function rateLimit(options: {
  maxRequests: number
  windowMs: number
  identifier: string
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()

  if (Math.random() < CLEANUP_CHANCE) {
    cleanup(now)
  }
  enforceSizeLimit(now)

  const record = rateMap.get(options.identifier)

  if (!record || now > record.resetAt) {
    rateMap.set(options.identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    }
  }

  if (record.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}
