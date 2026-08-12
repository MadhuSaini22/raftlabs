import { useEffect } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { ORDER_STATUSES, ORDER_STATUS_UPDATED_EVENT, ORDER_SUBSCRIBE_EVENT, type OrderStatus } from '../../constants/order'
import { formatCurrency, formatOrderStatus } from '../../utils/format'
import { api } from '../../lib/api'
import { createOrderSocket } from '../../lib/socket'
import type { Order } from '../../types/api'
import type { TrackedOrder } from './trackedOrders'
import { orderQueryKey } from './useOrderRealtime'

export const OrderHistory = ({ orders, onClose, onSelect }: { orders: TrackedOrder[]; onClose: () => void; onSelect: (order: TrackedOrder) => void }) => {
  const queryClient = useQueryClient()
  const results = useQueries({ queries: orders.map(({ id, trackingToken }) => ({ queryKey: orderQueryKey(id), queryFn: () => api.getOrder(id, trackingToken) })) })
  useEffect(() => {
    if (orders.length === 0) return
    const socket = createOrderSocket()
    const subscribe = () => orders.forEach(({ id, trackingToken }) => socket.emit(ORDER_SUBSCRIBE_EVENT, { orderId: id, trackingToken }))
    const receive = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const event = payload as { orderId?: string; status?: OrderStatus; updatedAt?: string; cancellationReason?: string }
      if (!event.orderId || !event.updatedAt || !ORDER_STATUSES.includes(event.status as OrderStatus) || !orders.some(({ id }) => id === event.orderId)) return
      queryClient.setQueryData<Order>(orderQueryKey(event.orderId), (current) => current ? { ...current, status: event.status as OrderStatus, ...(event.cancellationReason ? { cancellationReason: event.cancellationReason, cancelledAt: event.updatedAt } : {}) } : current)
    }
    socket.on('connect', subscribe)
    socket.on(ORDER_STATUS_UPDATED_EVENT, receive)
    if (socket.connected) subscribe()
    return () => { socket.off('connect', subscribe); socket.off(ORDER_STATUS_UPDATED_EVENT, receive); socket.disconnect() }
  }, [orders, queryClient])
  return <div className="overlay tracked-orders"><section aria-label="Tracked orders"><button className="close" aria-label="Close tracked orders" onClick={onClose}><X/></button><p className="eyebrow"><span/> YOUR ORDERS</p><h2>Track an order</h2>{orders.length === 0 ? <p className="confirm-copy">You have no locally tracked orders yet.</p> : <div className="tracked-order-list">{results.map((result, index) => {
    const tracked = orders[index]
    if (result.isLoading) return <p key={tracked.id} role="status">Loading order #{tracked.id.slice(-6)}…</p>
    if (result.isError || !result.data) return <p key={tracked.id} role="alert">We couldn’t retrieve order #{tracked.id.slice(-6)}.</p>
    const order = result.data
    return <article key={order._id} className="tracked-order-card"><div><strong>Order #{order._id.slice(-6)}</strong><span className={`status-badge status-${order.status.toLowerCase()}`}>{formatOrderStatus(order.status)}</span></div><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p><strong>{formatCurrency(order.totalAmount)}</strong><button className="secondary" onClick={() => onSelect(tracked)}>Track order</button></article>
  })}</div>}<button className="secondary" onClick={onClose}>Back to menu</button></section></div>
}
