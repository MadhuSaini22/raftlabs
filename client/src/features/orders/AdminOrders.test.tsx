import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminOrders } from './AdminOrders'
import { api } from '../../lib/api'
import { createOrderSocket } from '../../lib/socket'
import type { Order } from '../../types/api'

vi.mock('../../lib/api', () => ({ api: { getOrders: vi.fn(), advanceOrderStatus: vi.fn(), cancelOrder: vi.fn(), logout: vi.fn() } }))
vi.mock('../../lib/socket', () => ({ createOrderSocket: vi.fn() }))
const mockedApi = vi.mocked(api)
const mockedSocket = vi.mocked(createOrderSocket)
const base = { _id: '65fbf2f0df5a0029aab00099', totalAmount: 12.5, customer: { name: 'Ada', phone: '+1 555 123 4567', address: '12 Analytical Engine Way' }, items: [{ menuItemId: '65fbf2f0df5a0029aab00001', name: 'Risotto', price: 12.5, quantity: 1 }] }
const page = (orders: Order[]) => ({ orders, pagination: { page: 1, limit: 10, total: orders.length, totalPages: orders.length ? 1 : 0 } })
const renderAdmin = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminOrders/></QueryClientProvider>)

afterEach(() => vi.resetAllMocks())

describe('admin orders', () => {
  it('renders incoming order details, advances one server-selected step per click, and stops at delivered', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders
      .mockResolvedValueOnce(page([{ ...base, status: 'RECEIVED' }]))
      .mockResolvedValueOnce(page([{ ...base, status: 'PREPARING' }]))
      .mockResolvedValueOnce(page([{ ...base, status: 'OUT_FOR_DELIVERY' }]))
      .mockResolvedValueOnce(page([{ ...base, status: 'DELIVERED' }]))
    mockedApi.advanceOrderStatus.mockResolvedValueOnce({ ...base, status: 'PREPARING' }).mockResolvedValueOnce({ ...base, status: 'OUT_FOR_DELIVERY' }).mockResolvedValueOnce({ ...base, status: 'DELIVERED' })
    const user = userEvent.setup()
    renderAdmin()
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
    expect(screen.getByText('12 Analytical Engine Way')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Preparing' }))
    expect(await screen.findByText('PREPARING', { selector: '.status-badge' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Out for Delivery' }))
    expect(await screen.findByText('OUT FOR DELIVERY', { selector: '.status-badge' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Delivered' }))
    expect(await screen.findByRole('button', { name: 'Delivered' })).toBeDisabled()
    expect(mockedApi.advanceOrderStatus).toHaveBeenCalledTimes(3)
    expect(mockedApi.advanceOrderStatus.mock.calls.at(-1)?.[0]).toBe(base._id)
  })

  it('adds an order received through realtime without refetching', async () => {
    const socket = { on: vi.fn(), off: vi.fn(), disconnect: vi.fn() }
    mockedSocket.mockReturnValue(socket as never)
    mockedApi.getOrders.mockResolvedValue(page([]))
    renderAdmin()
    expect(await screen.findByText('No matching orders.')).toBeInTheDocument()
    const handler = socket.on.mock.calls.find(([event]) => event === 'order:created')?.[1] as (order: typeof base & { status: 'RECEIVED' }) => void
    mockedApi.getOrders
      .mockResolvedValueOnce(page([{ ...base, status: 'RECEIVED' }]))
      .mockResolvedValueOnce(page([{ ...base, status: 'CANCELLED', cancellationReason: 'Customer changed plans', cancelledAt: '2026-08-12T12:00:00.000Z' }]))
    handler({ ...base, status: 'RECEIVED' })
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
  })

  it('refetches admin orders once for a status-change event and cleans up the listener', async () => {
    const socket = { on: vi.fn(), off: vi.fn(), disconnect: vi.fn() }
    mockedSocket.mockReturnValue(socket as never)
    mockedApi.getOrders.mockResolvedValue(page([{ ...base, status: 'RECEIVED' }]))
    const view = renderAdmin()
    await screen.findByText(/Ada/)

    const handler = socket.on.mock.calls.find(([event]) => event === 'order:status-updated')?.[1] as () => void
    handler()
    await waitFor(() => expect(mockedApi.getOrders).toHaveBeenCalledTimes(2))
    view.unmount()
    expect(socket.off).toHaveBeenCalledWith('order:status-updated', handler)
    expect(socket.disconnect).toHaveBeenCalledOnce()
  })

  it('collects a cancellation reason in a confirmation dialog and updates the order immediately', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders
      .mockResolvedValueOnce(page([{ ...base, status: 'RECEIVED' }]))
      .mockResolvedValueOnce(page([{ ...base, status: 'CANCELLED', cancellationReason: 'Customer changed plans', cancelledAt: '2026-08-12T12:00:00.000Z' }]))
    mockedApi.cancelOrder.mockResolvedValue({ ...base, status: 'CANCELLED', cancellationReason: 'Customer changed plans', cancelledAt: '2026-08-12T12:00:00.000Z' })
    const user = userEvent.setup()
    renderAdmin()
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cancellation reason' }), 'Customer changed plans')
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(await screen.findByText('CANCELLED', { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.getByText(/Customer changed plans/)).toBeInTheDocument()
    expect(mockedApi.cancelOrder).toHaveBeenCalledWith(base._id, 'Customer changed plans')
  })

  it('accepts a cancellation reason at the server-supported maximum length', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders.mockResolvedValue(page([{ ...base, status: 'RECEIVED' }]))
    mockedApi.cancelOrder.mockResolvedValue({ ...base, status: 'CANCELLED', cancellationReason: 'x'.repeat(300) })
    const user = userEvent.setup()
    renderAdmin()
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    await user.type(screen.getByRole('textbox', { name: 'Cancellation reason' }), 'x'.repeat(300))
    expect(screen.getByText('300 / 300')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await waitFor(() => expect(mockedApi.cancelOrder).toHaveBeenCalledWith(base._id, 'x'.repeat(300)))
  })

  it('rejects an overlong cancellation reason locally without sending a request', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    mockedApi.getOrders.mockResolvedValue(page([{ ...base, status: 'RECEIVED' }]))
    const user = userEvent.setup()
    renderAdmin()
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Cancel order' }))
    const reason = screen.getByRole('textbox', { name: 'Cancellation reason' })
    fireEvent.change(reason, { target: { value: 'x'.repeat(301) } })

    expect(screen.getByText('301 / 300')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('must be 300 characters or fewer')
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeDisabled()
    expect(mockedApi.cancelOrder).not.toHaveBeenCalled()
    expect(reason).toHaveValue('x'.repeat(301))
  })

  it('clamps a filtered page after an updated order leaves the final page', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    const first = { ...base, _id: '65fbf2f0df5a0029aab00001', status: 'PREPARING' as const }
    const final = { ...base, _id: '65fbf2f0df5a0029aab00002', customer: { ...base.customer, name: 'Final preparing order' }, status: 'PREPARING' as const }
    let preparingPageTwoRequests = 0
    mockedApi.getOrders.mockImplementation(async ({ status, page: requestedPage } = {}) => {
      if (status !== 'PREPARING') return page([])
      if (requestedPage === 1) return { orders: [first], pagination: { page: 1, limit: 10, total: preparingPageTwoRequests > 1 ? 1 : 2, totalPages: preparingPageTwoRequests > 1 ? 1 : 2 } }
      preparingPageTwoRequests += 1
      return preparingPageTwoRequests === 1
        ? { orders: [final], pagination: { page: 2, limit: 10, total: 2, totalPages: 2 } }
        : { orders: [], pagination: { page: 2, limit: 10, total: 1, totalPages: 1 } }
    })
    mockedApi.advanceOrderStatus.mockResolvedValue({ ...final, status: 'OUT_FOR_DELIVERY' })
    const user = userEvent.setup()
    renderAdmin()

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter orders by status' }), 'PREPARING')
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Final preparing order')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as Out for Delivery' }))

    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
    expect(screen.queryByText('Final preparing order')).not.toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('keeps page one valid and renders an empty state when a filter loses its only order', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    let preparingRequests = 0
    mockedApi.getOrders.mockImplementation(async ({ status } = {}) => {
      if (status !== 'PREPARING') return page([])
      preparingRequests += 1
      return preparingRequests === 1
        ? { orders: [{ ...base, status: 'PREPARING' as const }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }
        : { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    })
    mockedApi.advanceOrderStatus.mockResolvedValue({ ...base, status: 'OUT_FOR_DELIVERY' })
    const user = userEvent.setup()
    renderAdmin()

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter orders by status' }), 'PREPARING')
    await screen.findByText(/Ada/)
    await user.click(screen.getByRole('button', { name: 'Mark as Out for Delivery' }))

    expect(await screen.findByText('No matching orders.')).toBeInTheDocument()
    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument()
  })

  it('keeps other cards interactive while one status update is pending', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    const second = { ...base, _id: '65fbf2f0df5a0029aab00003', customer: { ...base.customer, name: 'Grace' }, status: 'RECEIVED' as const }
    mockedApi.getOrders.mockResolvedValue(page([{ ...base, status: 'RECEIVED' }, second]))
    let resolveUpdate: (order: Order) => void = () => undefined
    mockedApi.advanceOrderStatus.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve }) as never)
    const user = userEvent.setup()
    renderAdmin()

    const buttons = await screen.findAllByRole('button', { name: 'Mark as Preparing' })
    await user.click(buttons[0])
    expect(await screen.findByRole('button', { name: 'Updating…' })).toBeDisabled()
    expect(buttons[1]).not.toBeDisabled()
    await user.click(buttons[1])
    expect(mockedApi.advanceOrderStatus).toHaveBeenCalledTimes(2)
    resolveUpdate({ ...base, status: 'PREPARING' })
  })

  it('clears one card loading state and shows an error when its status update fails', async () => {
    mockedSocket.mockReturnValue({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() } as never)
    const second = { ...base, _id: '65fbf2f0df5a0029aab00004', customer: { ...base.customer, name: 'Grace' }, status: 'RECEIVED' as const }
    mockedApi.getOrders.mockResolvedValue(page([{ ...base, status: 'RECEIVED' }, second]))
    mockedApi.advanceOrderStatus.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderAdmin()

    const buttons = await screen.findAllByRole('button', { name: 'Mark as Preparing' })
    await user.click(buttons[0])
    expect(buttons[1]).not.toBeDisabled()
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t update this order')
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Mark as Preparing' })[0]).not.toBeDisabled())
    expect(screen.getAllByRole('button', { name: 'Mark as Preparing' })[1]).not.toBeDisabled()
  })
})
