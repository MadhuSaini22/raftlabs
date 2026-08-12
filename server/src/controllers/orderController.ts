import type { RequestHandler } from 'express'
import { orderService, type createOrderService } from '../services/orderService.js'

type OrderService = ReturnType<typeof createOrderService>

export const createOrderController = (service: OrderService = orderService) => {
  const createOrder: RequestHandler = async (req, res) => {
    const order = await service.create(req.body)
    res.status(201).json({ data: { ...order.toObject(), trackingToken: order.trackingToken } })
  }

  const getOrders: RequestHandler = async (_req, res) => {
    const orders = await service.getAll()
    res.status(200).json({ data: orders })
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
