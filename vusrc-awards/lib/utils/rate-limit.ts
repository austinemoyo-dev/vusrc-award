interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store — resets on server restart, fine for single-instance deployment
const store = new Map<string, RateLimitEntry>()

/**
 * Returns true if the key has exceeded the limit within the window.
 * Side effect: increments the counter.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (entry.count >= limit) return true
  entry.count++
  return false
}

export function getClientIp(request: Request): string {
  return (
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}
