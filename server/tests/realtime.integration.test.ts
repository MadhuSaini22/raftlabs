import { createServer, type Server as HttpServer } from 'node:http'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { io as createClient, type Socket } from 'socket.io-client'
import { Server } from 'socket.io'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { MenuItem } from '../src/models/MenuItem.js'
import { Order } from '../src/models/Order.js'
import { createSocketOrderStatusPublisher, registerOrderSocketHandlers } from '../src/realtime/orderStatusPublisher.js'
import { createOrderService } from '../src/services/orderService.js'
import { createAdminSession, hasAdminSession, readCookie, sessionCookie } from '../src/auth/session.js'

let mongo: MongoMemoryServer
let httpServer: HttpServer
let io: Server
let baseUrl: string
let menuItemId: string

const customer = { name: 'Grace Hopper', phone: '+1 555 987 6543', address: '1 Compiler Lane' }

const listen = (server: HttpServer) => new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const once = <T>(socket: Socket, event: string) => new Promise<T>((resolve) => socket.once(event, resolve))
const subscribe = (socket: Socket, orderId: string, trackingToken: string) => new Promise<{ subscribed: boolean }>((resolve) => socket.emit('order:subscribe', { orderId, trackingToken }, resolve))
const closeIo = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))
const adminCookie = () => `${sessionCookie}=${createAdminSession()}`

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
  httpServer = createServer()
  io = new Server(httpServer, { cors: { origin: '*' } })
  io.use((socket, next) => { socket.data.isAdmin = hasAdminSession(readCookie(socket.handshake.headers.cookie)); next() })
  io.on('connection', registerOrderSocketHandlers)
  httpServer.on('request', createApp(createOrderService(createSocketOrderStatusPublisher(io))))
  await listen(httpServer)
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP address')
  baseUrl = `http://127.0.0.1:${address.port}`
})

beforeEach(async () => {
  await Promise.all([MenuItem.deleteMany({}), Order.deleteMany({})])
  const menuItem = await MenuItem.create({ name: 'Realtime Bowl', description: 'Fresh and ready', price: 11, category: 'Bowls', image: 'bowl.jpg', available: true })
  menuItemId = String(menuItem._id)
})

afterAll(async () => {
  await closeIo(io)
  await mongoose.disconnect()
  await mongo?.stop()
})

describe('real-time status updates and atomic transitions', () => {
  it('publishes a newly persisted order for the admin order list', async () => {
    const socket = createClient(baseUrl, { transports: ['websocket'], forceNew: true, extraHeaders: { Cookie: adminCookie() } })
    await once<void>(socket, 'connect')
    const createdEvent = once<{ _id: string; status: string; customer: { name: string } }>(socket, 'order:created')
    const response = await request(httpServer).post('/api/v1/orders').send({ customer, items: [{ menuItemId, quantity: 1 }] }).expect(201)
    expect(await createdEvent).toMatchObject({ _id: response.body.data._id, status: 'RECEIVED', customer: { name: 'Grace Hopper' } })
    socket.disconnect()
  })

  it('connects, subscribes to an order room, and receives an event after a persisted status update', async () => {
    const created = await request(httpServer).post('/api/v1/orders').send({ customer, items: [{ menuItemId, quantity: 1 }] }).expect(201)
    const orderId = created.body.data._id as string
    const socket = createClient(baseUrl, { transports: ['websocket'], forceNew: true })
    await once<void>(socket, 'connect')
    expect(await subscribe(socket, orderId, 'wrong-token')).toEqual({ subscribed: false })
    expect(await subscribe(socket, orderId, created.body.data.trackingToken)).toEqual({ subscribed: true })

    const updateEvent = once<{ orderId: string; status: string; updatedAt: string }>(socket, 'order:status-updated')
    await request(httpServer).patch(`/api/v1/orders/${orderId}/status`).set('Cookie', adminCookie()).send({ status: 'PREPARING' }).expect(200)
    expect(await updateEvent).toMatchObject({ orderId, status: 'PREPARING' })
    expect((await Order.findById(orderId).lean())?.status).toBe('PREPARING')
    socket.disconnect()
  })

  it('atomically permits only one simultaneous RECEIVED -> PREPARING transition', async () => {
    const created = await request(httpServer).post('/api/v1/orders').send({ customer, items: [{ menuItemId, quantity: 1 }] }).expect(201)
    const orderId = created.body.data._id as string
    const responses = await Promise.all([
      request(httpServer).patch(`/api/v1/orders/${orderId}/status`).set('Cookie', adminCookie()).send({ status: 'PREPARING' }),
      request(httpServer).patch(`/api/v1/orders/${orderId}/status`).set('Cookie', adminCookie()).send({ status: 'PREPARING' }),
    ])

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409])
    expect((await Order.findById(orderId).lean())?.status).toBe('PREPARING')
  })

  it('does not publish an update when a transition is rejected', async () => {
    const published: unknown[] = []
    const app = createApp(createOrderService({ publishOrderStatusUpdate: (update) => { published.push(update) } }))
    const order = await Order.create({
      items: [{ menuItemId, name: 'Realtime Bowl', price: 11, quantity: 1 }], customer, totalAmount: 11, status: 'DELIVERED',
    })

    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).expect(409)
    expect(published).toEqual([])
  })

  it('does not roll back a persisted status when notification publishing fails', async () => {
    const app = createApp(createOrderService({ publishOrderStatusUpdate: () => { throw new Error('socket unavailable') } }))
    const order = await Order.create({
      items: [{ menuItemId, name: 'Realtime Bowl', price: 11, quantity: 1 }], customer, totalAmount: 11, status: 'RECEIVED',
    })

    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).send({ status: 'PREPARING' }).expect(200)
    expect((await Order.findById(order.id).lean())?.status).toBe('PREPARING')
  })
})
