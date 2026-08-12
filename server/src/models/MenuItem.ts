import { model, Schema } from 'mongoose'
export const MenuItem = model('MenuItem', new Schema({ name: { type: String, required: true }, description: { type: String, required: true }, price: { type: Number, required: true, min: 0 }, image: { type: String, required: true }, isAvailable: { type: Boolean, default: true } }, { timestamps: true }))
