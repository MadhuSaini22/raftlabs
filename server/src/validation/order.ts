import { z } from 'zod'
import { CUSTOMER_ADDRESS_MAX_LENGTH, CUSTOMER_ADDRESS_MIN_LENGTH, CUSTOMER_NAME_MAX_LENGTH, CUSTOMER_NAME_MIN_LENGTH, CUSTOMER_PHONE_MAX_LENGTH, CUSTOMER_PHONE_MIN_LENGTH, ORDER_ITEM_MAX_QUANTITY, ORDER_STATUSES } from '../constants/order.js'
import { DEFAULT_ADMIN_ORDERS_PAGE_SIZE, DEFAULT_PAGE_NUMBER, MAX_ADMIN_ORDERS_PAGE_SIZE } from '../constants/pagination.js'

const customerSchema = z.object({
  name: z.string().trim().min(CUSTOMER_NAME_MIN_LENGTH).max(CUSTOMER_NAME_MAX_LENGTH),
  phone: z.string().trim().regex(new RegExp(`^[+()\\-\\s\\d]{${CUSTOMER_PHONE_MIN_LENGTH},${CUSTOMER_PHONE_MAX_LENGTH}}$`)),
  address: z.string().trim().min(CUSTOMER_ADDRESS_MIN_LENGTH).max(CUSTOMER_ADDRESS_MAX_LENGTH),
})

export const createOrderSchema = z.object({
  customer: customerSchema,
  items: z.array(z.object({
    menuItemId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().positive().max(ORDER_ITEM_MAX_QUANTITY),
  })).min(1),
})

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE_NUMBER),
  limit: z.coerce.number().int().positive().max(MAX_ADMIN_ORDERS_PAGE_SIZE).default(DEFAULT_ADMIN_ORDERS_PAGE_SIZE),
  status: z.enum(ORDER_STATUSES).optional(),
})
