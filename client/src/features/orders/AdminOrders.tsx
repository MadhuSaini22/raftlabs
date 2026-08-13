import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { ORDER_STATUSES, type OrderStatus } from '../../constants/order'
import { api } from '../../lib/api'
import { createOrderSocket } from '../../lib/socket'
import type { AdminOrdersPage, Order } from '../../types/api'
import { formatCurrency, formatOrderStatus } from '../../utils/format'
import { ADMIN_ORDERS_PAGE_SIZE, DEFAULT_PAGE_NUMBER } from '../../constants/config'

const canCancel = (order: Order) => ['RECEIVED', 'PREPARING'].includes(order.status)
const nextAction = (status: OrderStatus) => {
  if (status === 'RECEIVED') return 'Mark as Preparing'
  if (status === 'PREPARING') return 'Mark as Out for Delivery'
  if (status === 'OUT_FOR_DELIVERY') return 'Mark as Delivered'
  return status === 'CANCELLED' ? 'Cancelled' : 'Delivered'
}

export const AdminOrders = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE_NUMBER)
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [updateErrorIds, setUpdateErrorIds] = useState<Set<string>>(new Set())
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [cancelError, setCancelError] = useState(false)
  const queryKey = ['orders', page, status] as const
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => api.getOrders({ page, limit: ADMIN_ORDERS_PAGE_SIZE, status: status || undefined }),
  })

  useEffect(() => {
    const socket = createOrderSocket()
    const invalidateOrders = () => queryClient.invalidateQueries({ queryKey: ['orders'] })
    socket.on('order:created', invalidateOrders)
    socket.on('order:status-updated', invalidateOrders)
    return () => {
      socket.off('order:created', invalidateOrders)
      socket.off('order:status-updated', invalidateOrders)
      socket.disconnect()
    }
  }, [queryClient])

  const refreshPage = async (pageToRefresh: number, key: readonly unknown[]) => {
    await queryClient.invalidateQueries({ queryKey: key, exact: true })
    const refreshed = queryClient.getQueryData<AdminOrdersPage>(key)
    if (!refreshed) return

    const highestValidPage = Math.max(DEFAULT_PAGE_NUMBER, refreshed.pagination.totalPages)
    if (pageToRefresh > highestValidPage) {
      setPage((current) => current === pageToRefresh ? highestValidPage : current)
    }
  }

  const updateOrder = async (orderId: string) => {
    setUpdateErrorIds((current) => { const next = new Set(current); next.delete(orderId); return next })
    setUpdatingIds((current) => new Set(current).add(orderId))
    try {
      await api.advanceOrderStatus(orderId)
      await refreshPage(page, queryKey)
    } catch {
      setUpdateErrorIds((current) => new Set(current).add(orderId))
    } finally {
      setUpdatingIds((current) => { const next = new Set(current); next.delete(orderId); return next })
    }
  }

  const confirmCancellation = async () => {
    if (!cancelling) return
    const orderId = cancelling._id
    setCancelError(false)
    setCancellingIds((current) => new Set(current).add(orderId))
    try {
      await api.cancelOrder(orderId, reason.trim())
      setCancelling(null)
      await refreshPage(page, queryKey)
    } catch {
      setCancelError(true)
    } finally {
      setCancellingIds((current) => { const next = new Set(current); next.delete(orderId); return next })
    }
  }

  if (isLoading) return <main className="admin-shell"><p className="admin-state" role="status">Loading orders…</p></main>
  if (isError) {
    if ((error as { response?: { status?: number } }).response?.status === 401) window.location.assign('/admin/login')
    return <main className="admin-shell"><p className="admin-state" role="alert">We couldn’t load orders. Please try again.</p></main>
  }

  const orders = data?.orders ?? []
  const pagination = data?.pagination ?? { page: DEFAULT_PAGE_NUMBER, total: 0, totalPages: 0 }
  return <main className="admin-shell">
    <header className="admin-header">
      <a className="brand" href="/"><span>table</span>.<i>co</i></a>
      <div><p className="eyebrow"><span /> ADMIN PORTAL</p><h1>Orders</h1></div>
      <button className="admin-logout" onClick={async () => { await api.logout(); window.location.assign('/admin/login') }}>Logout</button>
    </header>
    <section className="admin-content">
      <div className="admin-title">
        <div><h2>Live order queue</h2><p>{pagination.total} order{pagination.total === 1 ? '' : 's'} in the queue</p></div>
        <label className="admin-filter">Status<select aria-label="Filter orders by status" value={status} onChange={(event) => { setStatus(event.target.value as OrderStatus | ''); setPage(1) }}><option value="">All orders</option>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{formatOrderStatus(value)}</option>)}</select></label>
      </div>
      {orders.length === 0 ? <div className="admin-empty"><h2>No matching orders.</h2><p>{status ? 'Try another status filter.' : 'New orders will appear here in real time.'}</p></div> : <div className="admin-orders">{orders.map((order) => {
        const isUpdating = updatingIds.has(order._id)
        return <article key={order._id} className="admin-order">
          <div className="admin-order-head"><div><strong>Order #{order._id.slice(-6)}</strong><time dateTime={order.createdAt}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now'}</time></div><span className={`status-badge status-${order.status.toLowerCase()}`}>{formatOrderStatus(order.status)}</span></div>
          <div className="admin-customer"><div><span>Customer</span><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div><div><span>Delivery address</span><p>{order.customer.address}</p></div></div>
          <ul className="admin-items">{order.items.map((item) => <li key={String(item.menuItemId)}><span>{item.quantity} × {item.name}</span><strong>{formatCurrency(item.price * item.quantity)}</strong></li>)}</ul>
          {order.status === 'CANCELLED' && <p className="admin-cancellation">Cancelled{order.cancelledAt ? ` ${new Date(order.cancelledAt).toLocaleString()}` : ''}{order.cancellationReason ? ` — ${order.cancellationReason}` : ''}</p>}
          {updateErrorIds.has(order._id) && <p className="form-error" role="alert">We couldn’t update this order. Please try again.</p>}
          <div className="admin-footer"><strong>{formatCurrency(order.totalAmount)}</strong><div>{canCancel(order) && <button className="admin-cancel" disabled={isUpdating} onClick={() => { setReason(''); setCancelError(false); setCancelling(order) }}>Cancel order</button>}<button className="admin-primary" disabled={['DELIVERED', 'CANCELLED'].includes(order.status) || isUpdating} onClick={() => void updateOrder(order._id)}>{isUpdating ? 'Updating…' : nextAction(order.status)}</button></div></div>
        </article>
      })}</div>}
      {pagination.totalPages > 0 && <nav className="admin-pagination" aria-label="Order pages"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    </section>
    {cancelling && <div className="overlay admin-modal"><section role="dialog" aria-modal="true" aria-labelledby="cancel-title"><button className="close" aria-label="Close cancellation dialog" onClick={() => setCancelling(null)}><X /></button><p className="eyebrow"><span /> CANCEL ORDER</p><h2 id="cancel-title">Cancel order #{cancelling._id.slice(-6)}?</h2><p className="confirm-copy">This cannot be undone. Add a reason for the customer and kitchen.</p><label>Cancellation reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label>{cancelError && <p className="form-error" role="alert">We couldn’t cancel this order. Please try again.</p>}<div className="modal-actions"><button className="secondary" onClick={() => setCancelling(null)}>Keep order</button><button className="admin-danger" disabled={cancellingIds.has(cancelling._id) || reason.trim().length < 2} onClick={() => void confirmCancellation()}>{cancellingIds.has(cancelling._id) ? 'Cancelling…' : 'Confirm cancellation'}</button></div></section></div>}
  </main>
}
