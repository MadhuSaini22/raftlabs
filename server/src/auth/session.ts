import { randomUUID } from 'node:crypto'
import { ADMIN_SESSION_MAX_AGE_SECONDS } from '../constants/auth.js'

const sessions = new Map<string, number>()
const invalidationListeners = new Set<(token: string) => void>()
let cleanupTimer: NodeJS.Timeout | undefined
export const sessionCookie = 'table_co_admin_session'
const sessionLifetimeMs = ADMIN_SESSION_MAX_AGE_SECONDS * 1000

const removeExpiredSessions = (now: number) => {
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) invalidateSession(token)
  }
}

const scheduleCleanup = () => {
  if (cleanupTimer) clearTimeout(cleanupTimer)
  const nextExpiry = Math.min(...sessions.values())
  if (!Number.isFinite(nextExpiry)) {
    cleanupTimer = undefined
    return
  }
  cleanupTimer = setTimeout(() => {
    cleanupTimer = undefined
    removeExpiredSessions(Date.now())
    scheduleCleanup()
  }, Math.max(0, nextExpiry - Date.now()))
  cleanupTimer.unref()
}

const invalidateSession = (token: string) => {
  if (!sessions.delete(token)) return
  for (const listener of invalidationListeners) listener(token)
}

export const createAdminSession = (now = Date.now()) => {
  removeExpiredSessions(now)
  const token = randomUUID()
  sessions.set(token, now + sessionLifetimeMs)
  scheduleCleanup()
  return token
}

export const hasAdminSession = (token?: string, now = Date.now()) => {
  removeExpiredSessions(now)
  scheduleCleanup()
  return Boolean(token && sessions.has(token))
}

export const destroyAdminSession = (token?: string) => {
  if (token) invalidateSession(token)
  scheduleCleanup()
}
export const readCookie = (header?: string) => header?.split(';').map((part) => part.trim().split('=')).find(([name]) => name === sessionCookie)?.[1]
export const onAdminSessionInvalidated = (listener: (token: string) => void) => {
  invalidationListeners.add(listener)
  return () => invalidationListeners.delete(listener)
}
export const resetAdminSessions = () => {
  sessions.clear()
  if (cleanupTimer) clearTimeout(cleanupTimer)
  cleanupTimer = undefined
}
