import { Minus, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { CreatedOrder } from '../../types/api'
import { useCart } from './cartContext'

const schema = z.object({ name: z.string().trim().min(2, 'Enter your name'), phone: z.string().trim().regex(/^[+()\-\s\d]{7,25}$/, 'Enter a valid phone number'), address: z.string().trim().min(5, 'Enter your delivery address') })
type Values = z.infer<typeof schema>
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const errorMessage = (error: unknown) => (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'We couldn’t place your order. Please try again.'

export const CartDrawer = ({ onOrderCreated, onClose }: { onOrderCreated: (order: CreatedOrder) => void; onClose: () => void }) => {
  const { cart, change, remove, clear } = useCart()
  const [checkout, setCheckout] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', address: '' } })
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const mutation = useMutation({ mutationFn: api.createOrder, onSuccess: (order) => { clear(); form.reset(); onOrderCreated(order) } })
  const submit = (customer: Values) => mutation.mutate({ customer, items: cart.map(({ _id, quantity }) => ({ menuItemId: _id, quantity })) })
  return <div className="overlay" onMouseDown={() => !checkout && onClose()}><aside className={checkout ? 'drawer checkout' : 'drawer'} onMouseDown={(event) => event.stopPropagation()}><button className="close" aria-label="Close cart" onClick={onClose}><X/></button>{checkout ? <><p className="eyebrow"><span/> DELIVERY DETAILS</p><h2>Almost there.</h2><form onSubmit={form.handleSubmit(submit)}><label>Name<input {...form.register('name')} placeholder="Your full name"/></label><label>Phone number<input {...form.register('phone')} placeholder="(555) 123-4567" type="tel"/></label><label>Delivery address<textarea {...form.register('address')} placeholder="Street address, apartment or suite" rows={3}/></label>{Object.values(form.formState.errors)[0]?.message && <p className="form-error">{Object.values(form.formState.errors)[0]?.message}</p>}{mutation.isError && <p className="form-error">{errorMessage(mutation.error)}</p>}<button className="primary full" type="submit" disabled={mutation.isPending || !cart.length}>{mutation.isPending ? 'Placing order…' : `Place order · ${money(subtotal)}`}</button><button className="back" type="button" onClick={() => setCheckout(false)}>← Back to cart</button></form></> : <><p className="eyebrow"><span/> YOUR ORDER</p><h2>Your cart {count ? `(${count})` : 'is empty'}</h2>{cart.length === 0 ? <div className="empty"><UtensilsCrossed size={34}/><p>Add a few dishes to get started.</p></div> : <><div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line._id}><img src={line.image} alt=""/><div><h3>{line.name}</h3><strong>{money(line.price)}</strong><div className="quantity"><button aria-label={`Decrease ${line.name}`} onClick={() => change(line._id, -1)}><Minus size={14}/></button><span>{line.quantity}</span><button aria-label={`Increase ${line.name}`} onClick={() => change(line._id, 1)}><Plus size={14}/></button></div></div><button className="remove" aria-label={`Remove ${line.name}`} onClick={() => remove(line._id)}><Trash2 size={16}/></button></div>)}</div><div className="summary"><p className="total"><span>Total</span><b>{money(subtotal)}</b></p></div><button className="primary full" onClick={() => setCheckout(true)}>Checkout <span>→</span></button></>}</>}</aside></div>
}
