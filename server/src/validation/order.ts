import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+()\-\s\d]{7,25}$/),
  address: z.string().trim().min(5).max(300),
})

export const createOrderSchema = z.object({
  customer: customerSchema,
  items: z.array(z.object({
    menuItemId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().positive().max(20),
  })).min(1),
})
