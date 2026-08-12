import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createOrderSocket } from '../../lib/socket'
import { ORDER_STATUSES, ORDER_STATUS_UPDATED_EVENT, ORDER_SUBSCRIBE_EVENT, type OrderStatus } from '../../constants/order'
import type { Order } from '../../types/api'

type Update = { orderId: string; status: OrderStatus; updatedAt: string; cancellationReason?: string }
const isUpdate = (value: unknown): value is Update => {
  if (!value || typeof value !== 'object') return false
  const update = value as Record<string, unknown>
  return typeof update.orderId === 'string' && typeof update.updatedAt === 'string' && ORDER_STATUSES.includes(update.status as OrderStatus)
}

export const orderQueryKey = (orderId: string) => ['order', orderId] as const

export const useOrderRealtime = (orderId: string | null, trackingToken?: string) => {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!orderId || !trackingToken) return
    const socket = createOrderSocket()
    const subscribe = () => socket.emit(ORDER_SUBSCRIBE_EVENT, { orderId, trackingToken })
    const receive = (payload: unknown) => {
      if (!isUpdate(payload) || payload.orderId !== orderId) return
      queryClient.setQueryData<Order>(orderQueryKey(orderId), (current) => current ? {
        ...current,
        status: payload.status,
        ...(payload.cancellationReason ? { cancellationReason: payload.cancellationReason, cancelledAt: payload.updatedAt } : {}),
      } : current)
    }
    socket.on('connect', subscribe)
    socket.on(ORDER_STATUS_UPDATED_EVENT, receive)
    if (socket.connected) subscribe()
    return () => {
      socket.off('connect', subscribe)
      socket.off(ORDER_STATUS_UPDATED_EVENT, receive)
      socket.disconnect()
    }
  }, [orderId, trackingToken, queryClient])
}
