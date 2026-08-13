import type { RequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS } from '../constants/auth.js'

type Attempt = { count: number; resetAt: number }
type Options = { windowMs?: number; maxAttempts?: number; now?: () => number }
type LoginRateLimiter = RequestHandler & { reset: () => void }

export const createLoginRateLimit = ({ windowMs = LOGIN_RATE_LIMIT_WINDOW_MS, maxAttempts = LOGIN_RATE_LIMIT_MAX_ATTEMPTS, now = Date.now }: Options = {}): LoginRateLimiter => {
  const attempts = new Map<string, Attempt>()

  const limiter: LoginRateLimiter = (req, res, next) => {
    const timestamp = now()
    for (const [ip, attempt] of attempts) {
      if (attempt.resetAt <= timestamp) attempts.delete(ip)
    }

    const ip = req.ip || 'unknown'
    const attempt = attempts.get(ip)
    if (attempt && attempt.count >= maxAttempts) {
      next(new AppError('Too many login attempts. Please try again later.', 429, 'LOGIN_RATE_LIMITED'))
      return
    }

    res.once('finish', () => {
      if (res.statusCode !== 401) return
      const current = attempts.get(ip)
      const nextAttempt = !current || current.resetAt <= now()
        ? { count: 1, resetAt: now() + windowMs }
        : { ...current, count: current.count + 1 }
      attempts.set(ip, nextAttempt)
    })
    next()
  }

  limiter.reset = () => attempts.clear()
  return limiter
}

/** Process-local protection for the small single-instance deployment. */
export const loginRateLimit = createLoginRateLimit()
export const resetLoginRateLimit = () => loginRateLimit.reset()
