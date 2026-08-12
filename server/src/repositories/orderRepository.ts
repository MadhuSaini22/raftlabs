import { Order, type OrderStatus } from '../models/Order.js'
import { CANCELLABLE_STATUSES } from '../constants/order.js'

type NewOrder = {
  items: Array<{ menuItemId: unknown; name: string; price: number; quantity: number }>
  customer: { name: string; phone: string; address: string }
  totalAmount: number
  status: OrderStatus
}

export const orderRepository = {
  create: (order: NewOrder) => Order.create(order),
  findById: (id: string) => Order.findById(id),
  findByTrackingToken: (id: string, trackingToken: string) => Order.findOne({ _id: id, trackingToken }),
  findAll: () => Order.find().sort({ createdAt: -1 }).lean(),
  transitionStatus: (id: string, expectedStatus: OrderStatus, status: OrderStatus) => Order.findOneAndUpdate(
    { _id: id, status: expectedStatus },
    { $set: { status } },
    { new: true, runValidators: true },
  ),
  cancel: (id: string, reason: string) => Order.findOneAndUpdate({ _id: id, status: { $in: CANCELLABLE_STATUSES } }, { $set: { status: 'CANCELLED', cancellationReason: reason, cancelledAt: new Date() } }, { new: true, runValidators: true }),
  deleteById: (id: string) => Order.findByIdAndDelete(id),
}
