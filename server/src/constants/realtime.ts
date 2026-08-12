export const ORDER_STATUS_UPDATED_EVENT = 'order:status-updated'
export const ORDER_CREATED_EVENT = 'order:created'
export const ORDER_SUBSCRIBE_EVENT = 'order:subscribe'
export const ADMIN_ROOM = 'admin'
export const orderRoom = (orderId: string) => `order:${orderId}`
