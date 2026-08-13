import { Router } from 'express'
import { createOrderController } from '../controllers/orderController.js'
import { validateBody } from '../middleware/validateRequest.js'
import { createOrderSchema } from '../validation/order.js'
import { requireAdmin } from '../middleware/authenticate.js'
import { z } from 'zod'
import { orderService, type createOrderService } from '../services/orderService.js'
import { CANCELLATION_REASON_MAX_LENGTH, CANCELLATION_REASON_MIN_LENGTH } from '../constants/order.js'

export const createOrderRoutes = (service: ReturnType<typeof createOrderService> = orderService) => {
  const { cancelOrder, createOrder, deleteOrder, getOrder, updateOrderStatus } = createOrderController(service)
  const router = Router()
  router.post('/', validateBody(createOrderSchema), createOrder)
  router.get('/:id', getOrder)
  router.patch('/:id/status', requireAdmin, updateOrderStatus)
  router.patch('/:id/cancel', requireAdmin, validateBody(z.object({ reason: z.string().trim().min(CANCELLATION_REASON_MIN_LENGTH).max(CANCELLATION_REASON_MAX_LENGTH) })), cancelOrder)
  router.delete('/:id', requireAdmin, deleteOrder)
  return router
}

export const orderRoutes = createOrderRoutes()
