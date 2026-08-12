import { Router } from 'express'
import { createOrderController } from '../controllers/orderController.js'
import { validateBody } from '../middleware/validateRequest.js'
import { createOrderSchema } from '../validation/order.js'
import { requireAdmin } from '../middleware/authenticate.js'
import { z } from 'zod'
import { orderService, type createOrderService } from '../services/orderService.js'

export const createOrderRoutes = (service: ReturnType<typeof createOrderService> = orderService) => {
  const { cancelOrder, createOrder, deleteOrder, getOrder, getOrders, updateOrderStatus } = createOrderController(service)
  const router = Router()
  router.post('/', validateBody(createOrderSchema), createOrder)
  router.get('/', requireAdmin, getOrders)
  router.get('/:id', getOrder)
  router.patch('/:id/status', requireAdmin, updateOrderStatus)
  router.patch('/:id/cancel', requireAdmin, validateBody(z.object({ reason: z.string().trim().min(2).max(300) })), cancelOrder)
  router.delete('/:id', requireAdmin, deleteOrder)
  return router
}

export const orderRoutes = createOrderRoutes()
