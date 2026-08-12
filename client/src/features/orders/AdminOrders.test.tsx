import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminOrders } from './AdminOrders'
import { api } from '../../lib/api'
import { createOrderSocket } from '../../lib/socket'

vi.mock('../../lib/api', () => ({ api: { getOrders: vi.fn(), advanceOrderStatus: vi.fn(), cancelOrder: vi.fn(), logout: vi.fn() } }))
vi.mock('../../lib/socket', () => ({ createOrderSocket: vi.fn() }))
const mockedApi = vi.mocked(api)
const mockedSocket = vi.mocked(createOrderSocket)
const base = { _id: '65fbf2f0df5a0029aab00099', totalAmount: 12.5, customer: { name: 'Ada', phone: '+1 555 123 4567', address: '12 Analytical Engine Way' }, items: [{ menuItemId: '65fbf2f0df5a0029aab00001', name: 'Risotto', price: 12.5, quantity: 1 }] }
const renderAdmin = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminOrders/></QueryClientProvider>)

afterEach(() => vi.resetAllMocks())

describe('admin orders', () => {
  it('renders incoming order details, advances one server-selected step per click, and stops at delivered', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders.mockResolvedValue([{ ...base, status: 'RECEIVED' }])
    mockedApi.advanceOrderStatus.mockResolvedValueOnce({ ...base, status: 'PREPARING' }).mockResolvedValueOnce({ ...base, status: 'OUT_FOR_DELIVERY' }).mockResolvedValueOnce({ ...base, status: 'DELIVERED' })
    const user = userEvent.setup()
    renderAdmin()
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
    expect(screen.getByText('12 Analytical Engine Way')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Preparing' }))
    expect(await screen.findByText('PREPARING')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Out for Delivery' }))
    expect(await screen.findByText('OUT FOR DELIVERY')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Delivered' }))
    expect(await screen.findByRole('button', { name: 'Delivered' })).toBeDisabled()
    expect(mockedApi.advanceOrderStatus).toHaveBeenCalledTimes(3)
    expect(mockedApi.advanceOrderStatus.mock.calls.at(-1)?.[0]).toBe(base._id)
  })

  it('adds an order received through realtime without refetching', async () => {
    const socket = { on: vi.fn(), off: vi.fn(), disconnect: vi.fn() }
    mockedSocket.mockReturnValue(socket as never)
    mockedApi.getOrders.mockResolvedValue([])
    renderAdmin()
    expect(await screen.findByText('No orders yet.')).toBeInTheDocument()
    const handler = socket.on.mock.calls.find(([event]) => event === 'order:created')?.[1] as (order: typeof base & { status: 'RECEIVED' }) => void
    handler({ ...base, status: 'RECEIVED' })
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
  })

  it('collects a cancellation reason in a confirmation dialog and updates the order immediately', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders.mockResolvedValue([{ ...base, status: 'RECEIVED' }])
    mockedApi.cancelOrder.mockResolvedValue({ ...base, status: 'CANCELLED', cancellationReason: 'Customer changed plans', cancelledAt: '2026-08-12T12:00:00.000Z' })
    const user = userEvent.setup()
    renderAdmin()
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cancellation reason' }), 'Customer changed plans')
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(await screen.findByText('CANCELLED')).toBeInTheDocument()
    expect(screen.getByText(/Customer changed plans/)).toBeInTheDocument()
    expect(mockedApi.cancelOrder).toHaveBeenCalledWith(base._id, 'Customer changed plans')
  })
})
