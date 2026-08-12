import { z } from 'zod'
import { ORDER_STATUSES } from '../models/Order.js'
export const createOrderSchema = z.object({ customer: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(25), address: z.string().trim().min(5).max(300) }), items: z.array(z.object({ menuItemId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().positive().max(20) })).min(1) })
export const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) })
