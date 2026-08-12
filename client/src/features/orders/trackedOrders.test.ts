import { afterEach, describe, expect, it } from 'vitest'
import { addTrackedOrder, getTrackedOrders } from './trackedOrders'

afterEach(() => localStorage.clear())

describe('tracked order storage', () => {
  it('keeps older IDs when a second order is created and never duplicates an ID', () => {
    expect(addTrackedOrder({ id: 'order-a', trackingToken: 'token-a' })).toEqual([{ id: 'order-a', trackingToken: 'token-a' }])
    expect(addTrackedOrder({ id: 'order-b', trackingToken: 'token-b' })).toEqual([{ id: 'order-b', trackingToken: 'token-b' }, { id: 'order-a', trackingToken: 'token-a' }])
    expect(addTrackedOrder({ id: 'order-a', trackingToken: 'token-a' })).toHaveLength(2)
    expect(getTrackedOrders()).toHaveLength(2)
  })
})
