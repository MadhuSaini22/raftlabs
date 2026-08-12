import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminLogin } from './AdminLogin'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => ({ api: { login: vi.fn() } }))
const mockedApi = vi.mocked(api)

afterEach(() => vi.resetAllMocks())

describe('admin login', () => {
  it('shows a pending state and server-authentication error without storing credentials', async () => {
    mockedApi.login.mockRejectedValue(new Error('invalid credentials'))
    const user = userEvent.setup()
    render(<AdminLogin />)
    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(mockedApi.login).toHaveBeenCalledWith('admin@example.com', 'wrong-password')
    expect(localStorage.getItem('adminSession')).toBeNull()
  })
})
