import { Router } from 'express'
import { menuRoutes } from './menuRoutes.js'
import { createOrderRoutes } from './orderRoutes.js'
import { orderService, type createOrderService } from '../services/orderService.js'
import { authRoutes } from './authRoutes.js'
import { requireAdmin } from '../middleware/authenticate.js'
import { createOrderController } from '../controllers/orderController.js'
import { validateQuery } from '../middleware/validateRequest.js'
import { adminOrderQuerySchema } from '../validation/order.js'

export const createApi = (service: ReturnType<typeof createOrderService> = orderService) => {
  const api = Router()
  api.get('/health', (_req, res) => res.status(200).json({ data: { status: 'ok' } }))
  api.use('/menu', menuRoutes)
  api.use('/admin/auth', authRoutes)
  api.get('/admin/orders', requireAdmin, validateQuery(adminOrderQuerySchema), createOrderController(service).getOrders)
  api.use('/orders', createOrderRoutes(service))
  return api
}

export const api = createApi()
