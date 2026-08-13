import { Types } from 'mongoose'
import type { Server, Socket } from 'socket.io'
import type { OrderStatus } from '../models/Order.js'
import { ADMIN_ROOM, ORDER_CREATED_EVENT, ORDER_STATUS_UPDATED_EVENT, ORDER_SUBSCRIBE_EVENT, orderRoom } from '../constants/realtime.js'
import { Order } from '../models/Order.js'
import { hasAdminSession, onAdminSessionInvalidated } from '../auth/session.js'

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

type AdminSocketData = { adminSessionToken?: string }

const emitToAuthorizedAdmins = (io: Server, event: string, payload: unknown) => {
  for (const socket of io.sockets.sockets.values()) {
    const token = (socket.data as AdminSocketData).adminSessionToken
    if (!socket.rooms.has(ADMIN_ROOM) || !token) continue
    if (hasAdminSession(token)) socket.emit(event, payload)
    else socket.leave(ADMIN_ROOM)
  }
}

export const registerAdminSessionRevocation = (io: Server) => onAdminSessionInvalidated((token) => {
  for (const socket of io.sockets.sockets.values()) {
    if ((socket.data as AdminSocketData).adminSessionToken === token) {
      socket.leave(ADMIN_ROOM)
      delete (socket.data as AdminSocketData).adminSessionToken
    }
  }
})

export const createSocketOrderStatusPublisher = (io: Server): OrderStatusPublisher => ({
  publishOrderStatusUpdate: (update) => {
    io.to(orderRoom(update.orderId)).emit(ORDER_STATUS_UPDATED_EVENT, update)
    emitToAuthorizedAdmins(io, ORDER_STATUS_UPDATED_EVENT, update)
  },
  publishOrderCreated: (order) => {
    emitToAuthorizedAdmins(io, ORDER_CREATED_EVENT, order)
  },
})

export const registerOrderSocketHandlers = (socket: Socket) => {
  const { adminSessionToken } = socket.data as AdminSocketData
  if (adminSessionToken && hasAdminSession(adminSessionToken)) socket.join(ADMIN_ROOM)
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
