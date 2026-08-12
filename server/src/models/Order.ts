import { model, Schema } from 'mongoose'
export const ORDER_STATUSES = ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]
const item = new Schema({ menuItemId: { type: Schema.Types.ObjectId, required: true }, name: String, price: Number, quantity: Number }, { _id: false })
export const Order = model('Order', new Schema({ items: { type: [item], required: true }, customer: { name: String, phone: String, address: String }, totalAmount: Number, status: { type: String, enum: ORDER_STATUSES, default: 'RECEIVED' } }, { timestamps: true }))
