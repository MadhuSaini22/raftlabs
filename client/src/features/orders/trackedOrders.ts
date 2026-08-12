export type TrackedOrder = { id: string; trackingToken: string }
const storageKey = 'trackedOrders'

export const getTrackedOrders = (): TrackedOrder[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((order): order is TrackedOrder => Boolean(order && typeof order.id === 'string' && typeof order.trackingToken === 'string')).filter((order, index, orders) => orders.findIndex(({ id }) => id === order.id) === index)
  } catch {
    return []
  }
}

export const addTrackedOrder = (order: TrackedOrder): TrackedOrder[] => {
  const orders = getTrackedOrders()
  const next = orders.some(({ id }) => id === order.id) ? orders : [order, ...orders]
  localStorage.setItem(storageKey, JSON.stringify(next))
  return next
}
