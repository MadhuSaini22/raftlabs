import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { MenuItem } from '../src/models/MenuItem.js'
import { Order } from '../src/models/Order.js'
import { createAdminSession, sessionCookie } from '../src/auth/session.js'

let mongo: MongoMemoryServer
let availableMenuId: string
let unavailableMenuId: string

const customer = { name: 'Ada Lovelace', phone: '+1 555 123 4567', address: '12 Analytical Engine Way' }
const orderPayload = (menuItemId = availableMenuId, quantity = 2) => ({ customer, items: [{ menuItemId, quantity }] })
const adminCookie = () => `${sessionCookie}=${createAdminSession()}`

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
})

beforeEach(async () => {
  await Promise.all([MenuItem.deleteMany({}), Order.deleteMany({})])
  const [available, unavailable] = await MenuItem.create([
    { name: 'Seasonal Risotto', description: 'Mushrooms and parmesan', price: 12.5, category: 'Main Course', image: 'risotto.jpg', available: true },
    { name: 'Sold out Soup', description: 'Tomato and basil', price: 7, category: 'Soup', image: 'soup.jpg', available: false },
  ])
  availableMenuId = String(available._id)
  unavailableMenuId = String(unavailable._id)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo?.stop()
})

describe('order API', () => {
  it('returns health, available menu items, and route-not-found errors', async () => {
    await request(app).get('/api/v1/health').expect(200, { data: { status: 'ok' } })
    const menu = await request(app).get('/api/v1/menu').expect(200)
    expect(menu.body.data).toHaveLength(1)
    expect(menu.body.data[0]).toMatchObject({ _id: availableMenuId, name: 'Seasonal Risotto' })
    await request(app).get('/api/v1/unknown').expect(404, { error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  it('creates an order using database prices, snapshots lines, and lists it', async () => {
    const response = await request(app).post('/api/v1/orders').send({
      ...orderPayload(), totalAmount: 0, items: [{ menuItemId: availableMenuId, quantity: 2, price: 0 }],
    }).expect(201)

    expect(response.body.data).toMatchObject({ totalAmount: 25, status: 'RECEIVED', customer })
    expect(response.body.data.trackingToken).toMatch(/^[a-f\d]{64}$/)
    expect(response.body.data.items).toEqual([expect.objectContaining({ menuItemId: availableMenuId, name: 'Seasonal Risotto', price: 12.5, quantity: 2 })])
    const listed = await request(app).get('/api/v1/orders').set('Cookie', adminCookie()).expect(200)
    expect(listed.body.data).toHaveLength(1)
  })

  it('gets an order, advances each valid lifecycle transition, and persists status', async () => {
    const created = await request(app).post('/api/v1/orders').send(orderPayload()).expect(201)
    const id = created.body.data._id as string
    const trackingToken = created.body.data.trackingToken as string
    await request(app).get(`/api/v1/orders/${id}`).set('X-Order-Tracking-Token', trackingToken).expect(200).expect(({ body }) => {
      expect(body.data).toMatchObject({ _id: id, totalAmount: 25, status: 'RECEIVED' })
    })

    for (const status of ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await request(app).patch(`/api/v1/orders/${id}/status`).set('Cookie', adminCookie()).send({ status }).expect(200).expect(({ body }) => expect(body.data.status).toBe(status))
    }
    expect((await Order.findById(id).lean())?.status).toBe('DELIVERED')
  })

  it('advances exactly one lifecycle step and rejects a delivered order', async () => {
    const order = await Order.create({ items: [{ menuItemId: availableMenuId, name: 'Seasonal Risotto', price: 12.5, quantity: 1 }], customer, totalAmount: 12.5, status: 'RECEIVED' })
    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).send({ status: 'DELIVERED' }).expect(200).expect(({ body }) => expect(body.data.status).toBe('PREPARING'))
    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).expect(200).expect(({ body }) => expect(body.data.status).toBe('OUT_FOR_DELIVERY'))
    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).expect(200).expect(({ body }) => expect(body.data.status).toBe('DELIVERED'))
    await request(app).patch(`/api/v1/orders/${order.id}/status`).set('Cookie', adminCookie()).expect(409, { error: { code: 'ORDER_ALREADY_FINAL', message: 'Order can no longer be advanced' } })
  })

  it('deletes an order and reports nonexistent or malformed IDs cleanly', async () => {
    const created = await request(app).post('/api/v1/orders').send(orderPayload()).expect(201)
    await request(app).delete(`/api/v1/orders/${created.body.data._id}`).set('Cookie', adminCookie()).expect(204)
    await request(app).get(`/api/v1/orders/${created.body.data._id}`).set('X-Order-Tracking-Token', created.body.data.trackingToken).expect(404, { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } })
    for (const method of ['get', 'delete', 'patch'] as const) {
      const path = method === 'patch' ? '/api/v1/orders/not-an-object-id/status' : '/api/v1/orders/not-an-object-id'
      const call = request(app)[method](path)
      await (method === 'patch' ? call.set('Cookie', adminCookie()).send({ status: 'PREPARING' }) : method === 'delete' ? call.set('Cookie', adminCookie()) : call).expect(400, { error: { code: 'INVALID_ID', message: 'Invalid order ID' } })
    }
  })

  it('rejects validation failures through the HTTP route', async () => {
    const invalidPayloads = [
      {}, { customer, items: [] }, { customer: { ...customer, name: '' }, items: [] },
      { customer: { ...customer, phone: 'not-a-phone' }, items: [{ menuItemId: availableMenuId, quantity: 1 }] },
      { customer: { ...customer, address: 'no' }, items: [{ menuItemId: availableMenuId, quantity: 1 }] },
      { customer, items: [{ quantity: 1 }] }, { customer, items: [{ menuItemId: 'bad-id', quantity: 1 }] },
      { customer, items: [{ menuItemId: availableMenuId }] }, { customer, items: [{ menuItemId: availableMenuId, quantity: 0 }] },
      { customer, items: [{ menuItemId: availableMenuId, quantity: -1 }] }, { customer, items: [{ menuItemId: availableMenuId, quantity: 1.5 }] },
    ]
    for (const payload of invalidPayloads) {
      await request(app).post('/api/v1/orders').send(payload).expect(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' } })
    }
  })

  it('rejects missing and unavailable menu items without creating orders', async () => {
    const missingId = new mongoose.Types.ObjectId().toString()
    await request(app).post('/api/v1/orders').send(orderPayload(missingId)).expect(404, { error: { code: 'MENU_ITEM_NOT_FOUND', message: 'One or more menu items do not exist' } })
    await request(app).post('/api/v1/orders').send(orderPayload(unavailableMenuId)).expect(409, { error: { code: 'MENU_ITEM_UNAVAILABLE', message: 'Sold out Soup is unavailable' } })
    expect(await Order.countDocuments()).toBe(0)
  })

  it('returns a safe malformed-JSON error', async () => {
    await request(app).post('/api/v1/orders').set('Content-Type', 'application/json').send('{bad json').expect(400, {
      error: { code: 'MALFORMED_JSON', message: 'Malformed JSON request body' },
    })
  })

  it('requires an admin session before an order can be changed or cancelled', async () => {
    const created = await request(app).post('/api/v1/orders').send(orderPayload()).expect(201)
    await request(app).patch(`/api/v1/orders/${created.body.data._id}/status`).expect(401)
    await request(app).patch(`/api/v1/orders/${created.body.data._id}/cancel`).send({ reason: 'Changed plans' }).expect(401)
  })

  it('requires an order-specific tracking token before returning customer data', async () => {
    const created = await request(app).post('/api/v1/orders').send(orderPayload()).expect(201)
    const id = created.body.data._id as string
    await request(app).get(`/api/v1/orders/${id}`).expect(404)
    await request(app).get(`/api/v1/orders/${id}`).set('X-Order-Tracking-Token', 'incorrect-token').expect(404)
    const response = await request(app).get(`/api/v1/orders/${id}`).set('X-Order-Tracking-Token', created.body.data.trackingToken).expect(200)
    expect(response.body.data.trackingToken).toBeUndefined()
  })

  it('creates and clears an httpOnly admin session through the login flow', async () => {
    const previousEmail = process.env.ADMIN_EMAIL
    const previousPassword = process.env.ADMIN_PASSWORD
    const previousClientUrl = process.env.CLIENT_URL
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    process.env.CLIENT_URL = 'https://raftlabs-lovat.vercel.app'
    try {
      await request(app).post('/api/v1/admin/auth/login').send({ email: 'admin@example.com', password: 'wrong' }).expect(401)
      const login = await request(app).post('/api/v1/admin/auth/login').send({ email: 'admin@example.com', password: 'correct-horse-battery-staple' }).expect(200)
      expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly')
      expect(login.headers['set-cookie']?.[0]).toContain('SameSite=None')
      expect(login.headers['set-cookie']?.[0]).toContain('Secure')
      const session = login.headers['set-cookie']?.[0].split(';')[0]
      await request(app).get('/api/v1/admin/auth/session').set('Cookie', session).expect(200, { data: { role: 'ADMIN' } })
      await request(app).post('/api/v1/admin/auth/logout').set('Cookie', session).expect(204)
      await request(app).get('/api/v1/admin/auth/session').set('Cookie', session).expect(401)
    } finally {
      if (previousEmail === undefined) delete process.env.ADMIN_EMAIL
      else process.env.ADMIN_EMAIL = previousEmail
      if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD
      else process.env.ADMIN_PASSWORD = previousPassword
      if (previousClientUrl === undefined) delete process.env.CLIENT_URL
      else process.env.CLIENT_URL = previousClientUrl
    }
  })

  it('cancels an eligible order, persists its reason, and prevents later transitions', async () => {
    const created = await request(app).post('/api/v1/orders').send(orderPayload()).expect(201)
    const id = created.body.data._id as string
    const cancelled = await request(app).patch(`/api/v1/orders/${id}/cancel`).set('Cookie', adminCookie()).send({ reason: 'Customer changed plans' }).expect(200)
    expect(cancelled.body.data).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Customer changed plans' })
    expect(cancelled.body.data.cancelledAt).toEqual(expect.any(String))
    await request(app).patch(`/api/v1/orders/${id}/status`).set('Cookie', adminCookie()).expect(409)
  })
})
