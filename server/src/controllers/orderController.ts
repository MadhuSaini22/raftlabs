import type { RequestHandler } from 'express'
import { orderService, type createOrderService } from '../services/orderService.js'
import { IDEMPOTENCY_KEY_MAX_LENGTH } from '../constants/order.js'

type OrderService = ReturnType<typeof createOrderService>

export const createOrderController = (service: OrderService = orderService) => {
  const createOrder: RequestHandler = async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key')
    if (idempotencyKey && !(new RegExp(`^[A-Za-z0-9_-]{1,${IDEMPOTENCY_KEY_MAX_LENGTH}}$`)).test(idempotencyKey)) {
      res.status(400).json({ error: { code: 'INVALID_IDEMPOTENCY_KEY', message: 'Invalid Idempotency-Key header' } })
      return
    }
    const { order, created } = await service.create(req.body, idempotencyKey)
    res.status(created ? 201 : 200).json({ data: { ...order.toObject(), trackingToken: order.trackingToken } })
  }

  const getOrders: RequestHandler = async (_req, res) => {
    const { page, limit, status } = res.locals.validatedQuery as { page: number; limit: number; status?: import('../models/Order.js').OrderStatus }
    res.status(200).json({ data: await service.getPage({ page, limit, status }) })
  }

  const getOrder: RequestHandler = async (req, res) => {
    const order = await service.getById(String(req.params.id), req.get('X-Order-Tracking-Token'))
    res.status(200).json({ data: order })
  }

  const updateOrderStatus: RequestHandler = async (req, res) => {
    const order = await service.updateStatus(String(req.params.id))
    res.status(200).json({ data: order })
  }
  const cancelOrder: RequestHandler = async (req, res) => res.status(200).json({ data: await service.cancel(String(req.params.id), req.body.reason) })

  const deleteOrder: RequestHandler = async (req, res) => {
    await service.remove(String(req.params.id))
    res.status(204).send()
  }

  return { createOrder, getOrders, getOrder, updateOrderStatus, cancelOrder, deleteOrder }
}

export const orderController = createOrderController()
