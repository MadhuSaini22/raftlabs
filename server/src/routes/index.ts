import { Router } from 'express'
import { MenuItem } from '../models/MenuItem.js'
import { Order } from '../models/Order.js'
import { createOrderSchema, statusSchema } from '../validation/order.js'
import { createOrder, DomainError, updateStatus } from '../services/orderService.js'
export const api = Router()
const send = (res: any, data: unknown, status = 200) => res.status(status).json({ data })
api.get('/health', (_req, res) => send(res, { status: 'ok' }))
api.get('/menu', async (_req, res, next) => { try { send(res, await MenuItem.find({ isAvailable: true }).lean()) } catch (e) { next(e) } })
api.post('/orders', async (req, res, next) => { try { const parsed = createOrderSchema.safeParse(req.body); if (!parsed.success) return res.status(422).json({ error: { message: 'Invalid order payload', details: parsed.error.flatten() } }); send(res, await createOrder(parsed.data), 201) } catch (e) { next(e) } })
api.get('/orders/:id', async (req, res, next) => { try { const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ error: { message: 'Order not found' } }); send(res, order) } catch (e) { next(e) } })
api.patch('/orders/:id/status', async (req, res, next) => { try { const parsed = statusSchema.safeParse(req.body); if (!parsed.success) return res.status(422).json({ error: { message: 'Invalid status' } }); send(res, await updateStatus(req.params.id, parsed.data.status)) } catch (e) { next(e) } })
api.delete('/orders/:id', async (req, res, next) => { try { const deleted = await Order.findByIdAndDelete(req.params.id); if (!deleted) return res.status(404).json({ error: { message: 'Order not found' } }); res.status(204).send() } catch (e) { next(e) } })
export const errorHandler = (err: unknown, _req: any, res: any, _next: any) => { if (err instanceof DomainError) return res.status(err.status).json({ error: { message: err.message } }); res.status(500).json({ error: { message: 'Something went wrong' } }) }
