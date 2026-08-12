import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/services/orderService.js'

describe('order domain errors', () => {
  it('retains an HTTP status for client-safe responses', () => {
    expect(new DomainError('Order not found', 404)).toMatchObject({ message: 'Order not found', status: 404 })
  })
})
