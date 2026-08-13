import { Types } from 'mongoose'
import type { z } from 'zod'
import { AppError } from '../errors/AppError.js'
import { type OrderStatus } from '../models/Order.js'
import { menuRepository } from '../repositories/menuRepository.js'
import { orderRepository } from '../repositories/orderRepository.js'
import type { OrderStatusPublisher } from '../realtime/orderStatusPublisher.js'
import type { createOrderSchema } from '../validation/order.js'
import { ORDER_TRANSITIONS } from '../constants/order.js'

type CreateOrderInput = z.infer<typeof createOrderSchema>
type AdminOrderQuery = { page: number; limit: number; status?: OrderStatus }

const assertValidId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400, 'INVALID_ID')
}

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from].includes(to)
const nextStatus = (status: OrderStatus) => ORDER_TRANSITIONS[status][0]

export const createOrderService = (publisher?: OrderStatusPublisher) => ({
  async create(payload: CreateOrderInput, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(idempotencyKey)
      if (existing) return { order: existing, created: false }
    }
    const menuItemIds = payload.items.map(({ menuItemId }) => menuItemId)
    const dishes = await menuRepository.findByIds(menuItemIds)

    if (dishes.length !== menuItemIds.length) {
      throw new AppError('One or more menu items do not exist', 404, 'MENU_ITEM_NOT_FOUND')
    }

    const dishesById = new Map(dishes.map((dish) => [String(dish._id), dish]))
    const items = payload.items.map(({ menuItemId, quantity }) => {
      const dish = dishesById.get(menuItemId)
      if (!dish) throw new AppError('Menu item not found', 404, 'MENU_ITEM_NOT_FOUND')
      if (!dish.available) throw new AppError(`${dish.name} is unavailable`, 409, 'MENU_ITEM_UNAVAILABLE')

      return { menuItemId: dish._id, name: dish.name, price: dish.price, quantity }
    })

    const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0)
    let order
    try {
      order = await orderRepository.create({ items, customer: payload.customer, totalAmount, status: 'RECEIVED', idempotencyKey })
    } catch (error) {
      if (idempotencyKey && (error as { code?: number }).code === 11000) {
        const existing = await orderRepository.findByIdempotencyKey(idempotencyKey)
        if (existing) return { order: existing, created: false }
      }
      throw error
    }
    try {
      await publisher?.publishOrderCreated?.({
        _id: order.id,
        status: order.status as OrderStatus,
        totalAmount: order.totalAmount,
        customer: { name: order.customer!.name, phone: order.customer!.phone, address: order.customer!.address },
        items: order.items.map((item) => ({ menuItemId: item.menuItemId, name: item.name, price: item.price, quantity: item.quantity })),
      })
    } catch {
      // Order persistence is authoritative; notification failure must not undo it.
    }
    return { order, created: true }
  },

  async getPage({ page, limit, status }: AdminOrderQuery) {
    const [orders, total] = await orderRepository.findPage(page, limit, status)
    return { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  },

  async getById(id: string, trackingToken?: string) {
    assertValidId(id)
    const order = trackingToken ? await orderRepository.findByTrackingToken(id, trackingToken) : null
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
    return order
  },

  async updateStatus(id: string) {
    assertValidId(id)
    const order = await orderRepository.findById(id)
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
    const next = nextStatus(order.status as OrderStatus)
    if (!next) throw new AppError('Order can no longer be advanced', 409, 'ORDER_ALREADY_FINAL')
    const updatedOrder = await orderRepository.transitionStatus(id, order.status as OrderStatus, next)
    if (!updatedOrder) {
      const currentOrder = await orderRepository.findById(id)
      if (!currentOrder) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
      throw new AppError(`Cannot transition from ${currentOrder.status} to its next status`, 409, 'INVALID_STATUS_TRANSITION')
    }

    if (publisher) {
      try {
        await publisher.publishOrderStatusUpdate({
          orderId: updatedOrder.id,
          status: updatedOrder.status as OrderStatus,
          updatedAt: updatedOrder.updatedAt.toISOString(),
        })
      } catch {
        // Status persistence is authoritative; a notification failure must not undo it.
      }
    }
    return updatedOrder
  },

  async cancel(id: string, reason: string) {
    assertValidId(id)
    const order = await orderRepository.findById(id)
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') throw new AppError('Order can no longer be cancelled', 409, 'ORDER_NOT_CANCELLABLE')
    const updatedOrder = await orderRepository.cancel(id, reason)
    if (!updatedOrder) throw new AppError('Order can no longer be cancelled', 409, 'ORDER_NOT_CANCELLABLE')
    try { await publisher?.publishOrderStatusUpdate({ orderId: updatedOrder.id, status: 'CANCELLED', updatedAt: updatedOrder.updatedAt.toISOString(), cancellationReason: reason }) } catch {}
    return updatedOrder
  },

  async remove(id: string) {
    assertValidId(id)
    const order = await orderRepository.deleteById(id)
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
  },
})

export const orderService = createOrderService()
