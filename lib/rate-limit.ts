const rateMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(options: {
  maxRequests: number
  windowMs: number
  identifier: string
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = rateMap.get(options.identifier)

  if (!record || now > record.resetAt) {
    rateMap.set(options.identifier, {
      count: 1,
      resetAt: now + options.windowMs
    })
    return { allowed: true, remaining: options.maxRequests - 1, resetAt: now + options.windowMs }
  }

  if (record.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return { allowed: true, remaining: options.maxRequests - record.count, resetAt: record.resetAt }
}
