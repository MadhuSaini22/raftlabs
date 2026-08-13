import type { OrderStatus } from '../constants/order'
export type { OrderStatus } from '../constants/order'

export type MenuItem = {
  _id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
}

export type Order = {
  _id: string
  status: OrderStatus
  cancellationReason?: string
  cancelledAt?: string
  createdAt?: string
  totalAmount: number
  customer: { name: string; phone: string; address: string }
  items: Array<{ menuItemId: string; name: string; price: number; quantity: number }>
  trackingToken?: string
}

export type CreateOrderPayload = {
  customer: Order['customer']
  items: Array<{ menuItemId: string; quantity: number }>
}

export type CreatedOrder = Order & { trackingToken: string }

export type AdminOrdersPage = {
  orders: Order[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
