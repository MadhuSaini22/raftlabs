import { Router } from 'express'
import { login, logout, session } from '../controllers/authController.js'
import { requireAdmin } from '../middleware/authenticate.js'
export const authRoutes = Router()
authRoutes.post('/login', login)
authRoutes.post('/logout', logout)
authRoutes.get('/session', requireAdmin, session)
