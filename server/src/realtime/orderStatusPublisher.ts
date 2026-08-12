import { Types } from 'mongoose'
import type { Server, Socket } from 'socket.io'
import type { OrderStatus } from '../models/Order.js'
import { ADMIN_ROOM, ORDER_CREATED_EVENT, ORDER_STATUS_UPDATED_EVENT, ORDER_SUBSCRIBE_EVENT, orderRoom } from '../constants/realtime.js'
import { Order } from '../models/Order.js'

export type RealtimeOrder = {
  _id: string
  status: OrderStatus
  totalAmount: number
  customer: { name: string; phone: string; address: string }
  items: Array<{ menuItemId: unknown; name: string; price: number; quantity: number }>
}

export type OrderStatusUpdate = {
  orderId: string
  status: OrderStatus
  updatedAt: string
  cancellationReason?: string
}

export interface OrderStatusPublisher {
  publishOrderStatusUpdate(update: OrderStatusUpdate): void | Promise<void>
  publishOrderCreated?(order: RealtimeOrder): void | Promise<void>
}

export const createSocketOrderStatusPublisher = (io: Server): OrderStatusPublisher => ({
  publishOrderStatusUpdate: (update) => {
    io.to(orderRoom(update.orderId)).emit(ORDER_STATUS_UPDATED_EVENT, update)
  },
  publishOrderCreated: (order) => {
    io.to(ADMIN_ROOM).emit(ORDER_CREATED_EVENT, order)
  },
})

export const registerOrderSocketHandlers = (socket: Socket) => {
  if ((socket.data as { isAdmin?: boolean }).isAdmin) socket.join(ADMIN_ROOM)
  socket.on(ORDER_SUBSCRIBE_EVENT, async (subscription: unknown, acknowledge?: (result: { subscribed: boolean }) => void) => {
    const { orderId, trackingToken } = subscription as { orderId?: unknown; trackingToken?: unknown }
    if (typeof orderId === 'string' && typeof trackingToken === 'string' && Types.ObjectId.isValid(orderId) && await Order.exists({ _id: orderId, trackingToken })) {
      socket.join(orderRoom(orderId))
      acknowledge?.({ subscribed: true })
      return
    }
    acknowledge?.({ subscribed: false })
  })
}
