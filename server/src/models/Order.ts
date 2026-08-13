import { randomBytes } from 'node:crypto'
import { model, Schema } from 'mongoose'
import { CANCELLATION_REASON_MAX_LENGTH, ORDER_STATUSES, type OrderStatus } from '../constants/order.js'
export { ORDER_STATUSES, type OrderStatus } from '../constants/order.js'
const item = new Schema({
  menuItemId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false })

export const Order = model('Order', new Schema({
  items: { type: [item], required: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
  },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ORDER_STATUSES, default: 'RECEIVED', required: true },
  trackingToken: { type: String, required: true, default: () => randomBytes(32).toString('hex'), select: false },
  // A sparse unique index leaves legacy orders without a key valid while making
  // repeated checkout requests resolve to one persisted order.
  idempotencyKey: { type: String, select: false, unique: true, sparse: true },
  cancellationReason: { type: String, maxlength: CANCELLATION_REASON_MAX_LENGTH },
  cancelledAt: { type: Date },
}, { timestamps: true }).index({ createdAt: -1 }).index({ status: 1, createdAt: -1 }))
