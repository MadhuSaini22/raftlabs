export const ORDER_STATUSES = ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  RECEIVED: ['PREPARING'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ['RECEIVED', 'PREPARING']
