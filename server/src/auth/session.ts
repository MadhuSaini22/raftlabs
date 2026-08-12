import { randomUUID } from 'node:crypto'
const sessions = new Set<string>()
export const sessionCookie = 'table_co_admin_session'
export const createAdminSession = () => { const token = randomUUID(); sessions.add(token); return token }
export const hasAdminSession = (token?: string) => Boolean(token && sessions.has(token))
export const destroyAdminSession = (token?: string) => { if (token) sessions.delete(token) }
export const readCookie = (header?: string) => header?.split(';').map((part) => part.trim().split('=')).find(([name]) => name === sessionCookie)?.[1]
