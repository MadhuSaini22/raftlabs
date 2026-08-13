import { Router } from 'express'
import { login, logout, session } from '../controllers/authController.js'
import { requireAdmin } from '../middleware/authenticate.js'
import { loginRateLimit } from '../middleware/loginRateLimit.js'
export const authRoutes = Router()
authRoutes.post('/login', loginRateLimit, login)
authRoutes.post('/logout', logout)
authRoutes.get('/session', requireAdmin, session)
