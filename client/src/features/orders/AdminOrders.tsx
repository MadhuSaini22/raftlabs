import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import { createOrderSocket } from '../../lib/socket'
import type { Order } from '../../types/api'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const ordersKey = ['orders'] as const
const cancellable = (order: Order) => ['RECEIVED', 'PREPARING'].includes(order.status)
const nextAction = (status: Order['status']) => status === 'RECEIVED' ? 'Mark as Preparing' : status === 'PREPARING' ? 'Mark as Out for Delivery' : status === 'OUT_FOR_DELIVERY' ? 'Mark as Delivered' : status === 'CANCELLED' ? 'Cancelled' : 'Delivered'

export const AdminOrders = () => {
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [reason, setReason] = useState('')
  const { data: orders = [], isLoading, isError, error } = useQuery({ queryKey: ordersKey, queryFn: api.getOrders })
  const transition = useMutation({ mutationFn: api.advanceOrderStatus, onSuccess: (order) => queryClient.setQueryData<Order[]>(ordersKey, (current = []) => current.map((item) => item._id === order._id ? order : item)) })
  const cancel = useMutation({ mutationFn: ({ id, reason: cancellationReason }: { id: string; reason: string }) => api.cancelOrder(id, cancellationReason), onSuccess: (order) => { queryClient.setQueryData<Order[]>(ordersKey, (current = []) => current.map((item) => item._id === order._id ? order : item)); setCancelling(null) } })
  useEffect(() => {
    const socket = createOrderSocket()
    const created = (order: Order) => queryClient.setQueryData<Order[]>(ordersKey, (current = []) => current.some((item) => item._id === order._id) ? current : [order, ...current])
    socket.on('order:created', created)
    return () => { socket.off('order:created', created); socket.disconnect() }
  }, [queryClient])
  if (isLoading) return <main className="admin-shell"><p className="admin-state" role="status">Loading orders…</p></main>
  if (isError) {
    if ((error as { response?: { status?: number } }).response?.status === 401) window.location.assign('/admin/login')
    return <main className="admin-shell"><p className="admin-state" role="alert">We couldn’t load orders. Please try again.</p></main>
  }
  return <main className="admin-shell">
    <header className="admin-header"><a className="brand" href="/"><span>table</span>.<i>co</i></a><div><p className="eyebrow"><span/> ADMIN PORTAL</p><h1>Orders</h1></div><button className="admin-logout" onClick={async () => { await api.logout(); window.location.assign('/admin/login') }}>Logout</button></header>
    <section className="admin-content"><div className="admin-title"><div><h2>Live order queue</h2><p>{orders.length} order{orders.length === 1 ? '' : 's'} in local history</p></div></div>
      {orders.length === 0 ? <div className="admin-empty"><h2>No orders yet.</h2><p>New orders will appear here in real time.</p></div> : <div className="admin-orders">{orders.map((order) => <article key={order._id} className="admin-order">
        <div className="admin-order-head"><div><strong>Order #{order._id.slice(-6)}</strong><time dateTime={order.createdAt}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now'}</time></div><span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span></div>
        <div className="admin-customer"><div><span>Customer</span><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div><div><span>Delivery address</span><p>{order.customer.address}</p></div></div>
        <ul className="admin-items">{order.items.map((item) => <li key={String(item.menuItemId)}><span>{item.quantity} × {item.name}</span><strong>{money(item.price * item.quantity)}</strong></li>)}</ul>
        {order.status === 'CANCELLED' && <p className="admin-cancellation">Cancelled{order.cancelledAt ? ` ${new Date(order.cancelledAt).toLocaleString()}` : ''}{order.cancellationReason ? ` — ${order.cancellationReason}` : ''}</p>}
        <div className="admin-footer"><strong>{money(order.totalAmount)}</strong><div>{cancellable(order) && <button className="admin-cancel" onClick={() => { setReason(''); setCancelling(order) }}>Cancel order</button>}<button className="admin-primary" disabled={['DELIVERED', 'CANCELLED'].includes(order.status) || transition.isPending} onClick={() => transition.mutate(order._id)}>{transition.isPending ? 'Updating…' : nextAction(order.status)}</button></div></div>
      </article>)}</div>}
    </section>
    {cancelling && <div className="overlay admin-modal"><section role="dialog" aria-modal="true" aria-labelledby="cancel-title"><button className="close" aria-label="Close cancellation dialog" onClick={() => setCancelling(null)}><X/></button><p className="eyebrow"><span/> CANCEL ORDER</p><h2 id="cancel-title">Cancel order #{cancelling._id.slice(-6)}?</h2><p className="confirm-copy">This cannot be undone. Add a reason for the customer and kitchen.</p><label>Cancellation reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label>{cancel.isError && <p className="form-error" role="alert">We couldn’t cancel this order. Please try again.</p>}<div className="modal-actions"><button className="secondary" onClick={() => setCancelling(null)}>Keep order</button><button className="admin-danger" disabled={cancel.isPending || reason.trim().length < 2} onClick={() => cancel.mutate({ id: cancelling._id, reason: reason.trim() })}>{cancel.isPending ? 'Cancelling…' : 'Confirm cancellation'}</button></div></section></div>}
  </main>
}
