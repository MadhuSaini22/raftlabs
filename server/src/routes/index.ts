import { Router } from 'express'
import { menuRoutes } from './menuRoutes.js'
import { createOrderRoutes } from './orderRoutes.js'
import { orderService, type createOrderService } from '../services/orderService.js'
import { authRoutes } from './authRoutes.js'
import { requireAdmin } from '../middleware/authenticate.js'

export const createApi = (service: ReturnType<typeof createOrderService> = orderService) => {
  const api = Router()
  api.get('/health', (_req, res) => res.status(200).json({ data: { status: 'ok' } }))
  api.use('/menu', menuRoutes)
  api.use('/admin/auth', authRoutes)
  api.get('/admin/orders', requireAdmin, async (_req, res) => res.status(200).json({ data: await service.getAll() }))
  api.use('/orders', createOrderRoutes(service))
  return api
}

export const api = createApi()
