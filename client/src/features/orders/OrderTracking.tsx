import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { orderQueryKey, useOrderRealtime } from './useOrderRealtime'
import type { OrderStatus } from '../../types/api'

const steps: { key: OrderStatus; label: string }[] = [
  { key: 'RECEIVED', label: 'Order received' }, { key: 'PREPARING', label: 'Preparing' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way' }, { key: 'DELIVERED', label: 'Delivered' },
]
type Props = { orderId: string; trackingToken: string; onClose: () => void }

export const OrderTracking = ({ orderId, trackingToken, onClose }: Props) => {
  const { data: order, isLoading, isError } = useQuery({ queryKey: orderQueryKey(orderId), queryFn: () => api.getOrder(orderId, trackingToken) })
  useOrderRealtime(orderId, trackingToken)
  const currentStep = order ? steps.findIndex((step) => step.key === order.status) : -1

  return <div className="overlay confirmation">
    <section>
      <button className="close" aria-label="Close order tracking" onClick={onClose}><X /></button>
      <div className="success">✓</div>
      <p className="eyebrow"><span /> ORDER TRACKING</p>
      <h2>{order?.status === 'CANCELLED' ? 'Order cancelled.' : 'We’re on it.'}</h2>
      {isLoading && <p role="status">Loading your order status…</p>}
      {isError && <p role="alert">We couldn’t retrieve this order’s status.</p>}
      {order && <>
        <p className="confirm-copy">Order #{order._id.slice(-6)} is currently <strong>{order.status.replaceAll('_', ' ').toLowerCase()}</strong>.</p>
        <p className="confirm-copy">Placed {new Date(order.createdAt ?? '').toLocaleString()} for {order.customer.name} at {order.customer.address}.</p>
        <ul>{order.items.map((item) => <li key={String(item.menuItemId)}>{item.quantity} × {item.name} — ${(item.price * item.quantity).toFixed(2)}</li>)}</ul>
        <p className="confirm-copy"><strong>Total ${(order.totalAmount).toFixed(2)}</strong></p>
        {order.status === 'CANCELLED' ? <p role="status">This order was cancelled{order.cancellationReason ? `: ${order.cancellationReason}` : '.'}</p> : <div className="tracking">{steps.map((step, index) => <div className={index <= currentStep ? 'track-step active' : 'track-step'} key={step.key}><i>{index < currentStep ? '✓' : index + 1}</i><span>{step.label}</span></div>)}</div>}
      </>}
      <button className="secondary" onClick={onClose}>Back to menu</button>
    </section>
  </div>
}
