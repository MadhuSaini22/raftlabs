import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { AppError } from '../src/errors/AppError.js'
import { canTransition } from '../src/services/orderService.js'

describe('order domain errors', () => {
  it('retains a stable code and HTTP status for client-safe responses', () => {
    expect(new AppError('Order not found', 404, 'ORDER_NOT_FOUND')).toMatchObject({
      message: 'Order not found', statusCode: 404, code: 'ORDER_NOT_FOUND',
    })
  })
  it('only allows the next lifecycle step', () => {
    expect(canTransition('RECEIVED', 'PREPARING')).toBe(true)
    expect(canTransition('RECEIVED', 'DELIVERED')).toBe(false)
    expect(canTransition('DELIVERED', 'PREPARING')).toBe(false)
  })
  it('exposes a versioned health endpoint', async () => {
    await request(app).get('/api/v1/health').expect(200, { data: { status: 'ok' } })
  })
})
