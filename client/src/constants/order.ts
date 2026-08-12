export const ORDER_STATUSES = ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]
export const ORDER_STATUS_UPDATED_EVENT = 'order:status-updated'
export const ORDER_SUBSCRIBE_EVENT = 'order:subscribe'
