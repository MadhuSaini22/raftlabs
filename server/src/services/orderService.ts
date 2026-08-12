import { Types } from 'mongoose'
import { MenuItem } from '../models/MenuItem.js'
import { Order, type OrderStatus } from '../models/Order.js'
import type { z } from 'zod'
import type { createOrderSchema } from '../validation/order.js'
const transitions: Record<OrderStatus, OrderStatus[]> = { RECEIVED: ['PREPARING'], PREPARING: ['OUT_FOR_DELIVERY'], OUT_FOR_DELIVERY: ['DELIVERED'], DELIVERED: [] }
export class DomainError extends Error { constructor(message: string, public status = 400) { super(message) } }
export async function createOrder(payload: z.infer<typeof createOrderSchema>) {
  const ids = payload.items.map(i => new Types.ObjectId(i.menuItemId)); const dishes = await MenuItem.find({ _id: { $in: ids } }).lean()
  if (dishes.length !== ids.length) throw new DomainError('One or more menu items no longer exist', 404)
  const byId = new Map(dishes.map(d => [String(d._id), d])); const items = payload.items.map(line => { const dish = byId.get(line.menuItemId)!; if (!dish.isAvailable) throw new DomainError(`${dish.name} is unavailable`); return { menuItemId: dish._id, name: dish.name, price: dish.price, quantity: line.quantity } })
  return Order.create({ items, customer: payload.customer, totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0), status: 'RECEIVED' })
}
export async function updateStatus(id: string, next: OrderStatus) { if (!Types.ObjectId.isValid(id)) throw new DomainError('Invalid order ID'); const order = await Order.findById(id); if (!order) throw new DomainError('Order not found', 404); if (!transitions[order.status as OrderStatus].includes(next)) throw new DomainError(`Cannot transition from ${order.status} to ${next}`, 409); order.status = next; return order.save() }
