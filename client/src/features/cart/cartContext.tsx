/* eslint-disable react-refresh/only-export-components -- this module exports the paired cart provider and consumer hook. */
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { MenuItem } from '../../types/api'

export type CartLine = MenuItem & { quantity: number }
type CartState = CartLine[]
type Action = { type: 'add'; item: MenuItem } | { type: 'change'; id: string; change: number } | { type: 'remove'; id: string } | { type: 'clear' }

const CartContext = createContext<{ cart: CartState; add: (item: MenuItem) => void; change: (id: string, amount: number) => void; remove: (id: string) => void; clear: () => void } | null>(null)

const reducer = (cart: CartState, action: Action): CartState => {
  if (action.type === 'add') {
    const existing = cart.find((line) => line._id === action.item._id)
    return existing ? cart.map((line) => line._id === action.item._id ? { ...line, quantity: line.quantity + 1 } : line) : [...cart, { ...action.item, quantity: 1 }]
  }
  if (action.type === 'change') return cart.flatMap((line) => line._id === action.id ? (line.quantity + action.change > 0 ? [{ ...line, quantity: line.quantity + action.change }] : []) : [line])
  if (action.type === 'remove') return cart.filter((line) => line._id !== action.id)
  return []
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, dispatch] = useReducer(reducer, [])
  const value = useMemo(() => ({ cart, add: (item: MenuItem) => dispatch({ type: 'add', item }), change: (id: string, amount: number) => dispatch({ type: 'change', id, change: amount }), remove: (id: string) => dispatch({ type: 'remove', id }), clear: () => dispatch({ type: 'clear' }) }), [cart])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
