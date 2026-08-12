import axios from 'axios'
import type { CreatedOrder, CreateOrderPayload, MenuItem, Order } from '../types/api'

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1', withCredentials: true })

export const api = {
  async getMenu() {
    return (await client.get<{ data: MenuItem[] }>('/menu')).data.data
  },
  async createOrder(payload: CreateOrderPayload) {
    return (await client.post<{ data: CreatedOrder }>('/orders', payload)).data.data
  },
  async getOrder(id: string, trackingToken: string) {
    return (await client.get<{ data: Order }>(`/orders/${id}`, { headers: { 'X-Order-Tracking-Token': trackingToken } })).data.data
  },
  async getOrders() {
    return (await client.get<{ data: Order[] }>('/admin/orders')).data.data
  },
  async advanceOrderStatus(id: string) {
    return (await client.patch<{ data: Order }>(`/orders/${id}/status`)).data.data
  },
  async cancelOrder(id: string, reason: string) { return (await client.patch<{ data: Order }>(`/orders/${id}/cancel`, { reason })).data.data },
  async login(email: string, password: string) { return (await client.post('/admin/auth/login', { email, password })).data },
  async logout() { await client.post('/admin/auth/logout') },
  async adminSession() { return (await client.get('/admin/auth/session')).data },
}
