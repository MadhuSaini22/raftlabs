import type { RequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'
import { hasAdminSession, readCookie } from '../auth/session.js'
export const requireAdmin: RequestHandler = (req, _res, next) => hasAdminSession(readCookie(req.headers.cookie)) ? next() : next(new AppError('Admin authentication required', 401, 'UNAUTHORIZED'))
