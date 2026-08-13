import axios from 'axios'
import type { AdminOrdersPage, CreatedOrder, CreateOrderPayload, MenuItem, Order, OrderStatus } from '../types/api'
import { ADMIN_ORDERS_PAGE_SIZE, DEFAULT_API_URL, DEFAULT_PAGE_NUMBER } from '../constants/config'

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL, withCredentials: true })

export const api = {
  async getMenu() {
    return (await client.get<{ data: MenuItem[] }>('/menu')).data.data
  },
  async createOrder(payload: CreateOrderPayload, idempotencyKey: string) {
    return (await client.post<{ data: CreatedOrder }>('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } })).data.data
  },
  async getOrder(id: string, trackingToken: string) {
    return (await client.get<{ data: Order }>(`/orders/${id}`, { headers: { 'X-Order-Tracking-Token': trackingToken } })).data.data
  },
  async getOrders({ page = DEFAULT_PAGE_NUMBER, limit, status }: { page?: number; limit?: number; status?: OrderStatus } = {}) {
    const pageSize = limit ?? ADMIN_ORDERS_PAGE_SIZE
    return (await client.get<{ data: AdminOrdersPage }>('/admin/orders', { params: { page, limit: pageSize, ...(status ? { status } : {}) } })).data.data
  },
  async advanceOrderStatus(id: string) {
    return (await client.patch<{ data: Order }>(`/orders/${id}/status`)).data.data
  },
  async cancelOrder(id: string, reason: string) { return (await client.patch<{ data: Order }>(`/orders/${id}/cancel`, { reason })).data.data },
  async login(email: string, password: string) { return (await client.post('/admin/auth/login', { email, password })).data },
  async logout() { await client.post('/admin/auth/logout') },
  async adminSession() { return (await client.get('/admin/auth/session')).data },
}
