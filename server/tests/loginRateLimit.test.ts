import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { createLoginRateLimit } from '../src/middleware/loginRateLimit.js'

const request = (ip: string) => ({ ip })
const run = (limiter: ReturnType<typeof createLoginRateLimit>, ip: string, status: number) => {
  const response = new EventEmitter() as EventEmitter & { statusCode: number; once: EventEmitter['once'] }
  response.statusCode = status
  let error: unknown
  limiter(request(ip) as never, response as never, (value?: unknown) => { error = value })
  if (!error) response.emit('finish')
  return error as { statusCode?: number } | undefined
}

describe('login rate limiting', () => {
  it('counts only failed logins, expires entries, and isolates IPs', () => {
    let clock = 0
    const limiter = createLoginRateLimit({ maxAttempts: 2, windowMs: 100, now: () => clock })
    expect(run(limiter, 'one', 200)).toBeUndefined()
    expect(run(limiter, 'one', 401)).toBeUndefined()
    expect(run(limiter, 'one', 401)).toBeUndefined()
    expect(run(limiter, 'two', 401)).toBeUndefined()
    expect(run(limiter, 'one', 401)?.statusCode).toBe(429)
    clock = 101
    expect(run(limiter, 'one', 401)).toBeUndefined()
  })
})
