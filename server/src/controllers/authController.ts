import type { RequestHandler } from 'express'
import { createAdminSession, destroyAdminSession, readCookie, sessionCookie } from '../auth/session.js'
import { AppError } from '../errors/AppError.js'
const cookie = (value: string, maxAge = 28800) => {
  const crossSite = process.env.CLIENT_URL?.startsWith('https://')
  return `${sessionCookie}=${value}; HttpOnly; SameSite=${crossSite ? 'None; Secure' : 'Lax'}; Path=/; Max-Age=${maxAge}`
}
export const login: RequestHandler = (req, res) => { if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new AppError('Admin login is not configured', 503, 'ADMIN_NOT_CONFIGURED'); if (req.body?.email !== process.env.ADMIN_EMAIL || req.body?.password !== process.env.ADMIN_PASSWORD) throw new AppError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS'); res.setHeader('Set-Cookie', cookie(createAdminSession())).status(200).json({ data: { role: 'ADMIN' } }) }
export const logout: RequestHandler = (req, res) => { destroyAdminSession(readCookie(req.headers.cookie)); res.setHeader('Set-Cookie', cookie('', 0)).status(204).send() }
export const session: RequestHandler = (_req, res) => res.status(200).json({ data: { role: 'ADMIN' } })
