import { afterEach, describe, expect, it } from 'vitest'
import { ADMIN_SESSION_MAX_AGE_SECONDS } from '../src/constants/auth.js'
import { createAdminSession, destroyAdminSession, hasAdminSession, onAdminSessionInvalidated, resetAdminSessions } from '../src/auth/session.js'

afterEach(resetAdminSessions)

describe('admin sessions', () => {
  it('accepts a valid session and rejects and removes an expired session', () => {
    const now = 1_000
    const valid = createAdminSession(now)
    const expired = createAdminSession(now - ADMIN_SESSION_MAX_AGE_SECONDS * 1000)

    expect(hasAdminSession(valid, now)).toBe(true)
    expect(hasAdminSession(expired, now)).toBe(false)
    expect(hasAdminSession(expired, now)).toBe(false)
  })

  it('invalidates a session immediately on logout', () => {
    const token = createAdminSession()
    destroyAdminSession(token)
    expect(hasAdminSession(token)).toBe(false)
  })

  it('prunes expired sessions on its scheduled cleanup without another request', async () => {
    const invalidated: string[] = []
    const unsubscribe = onAdminSessionInvalidated((token) => invalidated.push(token))
    const token = createAdminSession(Date.now() - ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 20)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(invalidated).toContain(token)
    unsubscribe()
  })
})
