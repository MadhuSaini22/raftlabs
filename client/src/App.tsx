import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Clock3, MapPin, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from 'lucide-react'
import './App.css'

type MenuItem = { id: string; name: string; description: string; price: number; image: string; tag?: string }
type CartLine = MenuItem & { quantity: number }
type Status = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED'

const menu: MenuItem[] = [
  { id: '1', name: 'Truffle Mushroom Risotto', description: 'Creamy arborio rice, wild mushrooms & parmesan', price: 18.5, image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=900&q=85', tag: 'Bestseller' },
  { id: '2', name: 'Crispy Chicken Burger', description: 'Buttermilk chicken, pickles & house slaw', price: 14.5, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85' },
  { id: '3', name: 'Roasted Tomato Pasta', description: 'Slow-roasted tomatoes, basil & stracciatella', price: 16, image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=85', tag: 'Chef’s pick' },
  { id: '4', name: 'Garden Grain Bowl', description: 'Herbed quinoa, avocado, greens & tahini', price: 13.5, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85' },
]

const steps: { key: Status; label: string }[] = [
  { key: 'RECEIVED', label: 'Order received' }, { key: 'PREPARING', label: 'Preparing' }, { key: 'OUT_FOR_DELIVERY', label: 'On the way' }, { key: 'DELIVERED', label: 'Delivered' },
]
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function App() {
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [status, setStatus] = useState<Status>('RECEIVED')
  const [formError, setFormError] = useState('')
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const delivery = subtotal ? 2.5 : 0
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)

  const add = (item: MenuItem) => setCart(lines => {
    const exists = lines.find(line => line.id === item.id)
    return exists ? lines.map(line => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...lines, { ...item, quantity: 1 }]
  })
  const quantity = (id: string, change: number) => setCart(lines => lines.flatMap(line => line.id === id ? (line.quantity + change > 0 ? [{ ...line, quantity: line.quantity + change }] : []) : [line]))
  const placeOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (!String(data.get('name')).trim() || !String(data.get('phone')).trim() || !String(data.get('address')).trim()) { setFormError('Please complete all delivery details.'); return }
    setFormError(''); setCheckout(false); setCartOpen(false); setPlaced(true)
    setTimeout(() => setStatus('PREPARING'), 1800)
    setTimeout(() => setStatus('OUT_FOR_DELIVERY'), 4200)
    setTimeout(() => setStatus('DELIVERED'), 7000)
  }
  const currentStep = steps.findIndex(step => step.key === status)

  return <main>
    <header className="topbar"><a className="brand" href="#top"><span>table</span>.<i>co</i></a><nav><a href="#menu">Menu</a><a href="#how">How it works</a></nav><button className="cart-trigger" onClick={() => setCartOpen(true)}><ShoppingBag size={18}/><span>Cart</span>{count > 0 && <b>{count}</b>}</button></header>
    <section id="top" className="hero"><div className="hero-copy"><p className="eyebrow"><span/> GOOD FOOD, DELIVERED</p><h1>Comfort food,<br/><em>thoughtfully made.</em></h1><p className="lead">Seasonal ingredients, cooked from scratch and brought straight to your door.</p><a href="#menu" className="primary">Explore the menu <span>→</span></a><div className="hero-notes"><span><Clock3 size={16}/> 25–35 min delivery</span><span><MapPin size={16}/> Downtown & nearby</span></div></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=90" alt="Freshly prepared bowl of food"/><div className="image-note"><span className="dot"/> Made fresh today</div></div></section>
    <section id="menu" className="menu-section"><div className="section-heading"><div><p className="eyebrow"><span/> TODAY’S KITCHEN</p><h2>A little something<br/>for every appetite.</h2></div><p>Our menu changes with the seasons, but it’s always made with care.</p></div><div className="menu-grid">{menu.map(item => <article className="dish" key={item.id}><div className="dish-image"><img src={item.image} alt={item.name}/>{item.tag && <small>{item.tag}</small>}</div><div className="dish-details"><div><h3>{item.name}</h3><p>{item.description}</p></div><div className="dish-bottom"><strong>{money(item.price)}</strong><button aria-label={`Add ${item.name} to cart`} onClick={() => add(item)}>Add <Plus size={16}/></button></div></div></article>)}</div></section>
    <section id="how" className="how"><p className="eyebrow"><span/> SIMPLE BY DESIGN</p><h2>Dinner, handled.</h2><div className="how-grid"><div><b>01</b><h3>Choose your favourites</h3><p>Pick from a considered menu of seasonal plates.</p></div><div><b>02</b><h3>We cook it fresh</h3><p>Your order goes straight to our kitchen.</p></div><div><b>03</b><h3>Enjoy at home</h3><p>Track your order right to your door.</p></div></div></section>
    <footer><a className="brand" href="#top"><span>table</span>.<i>co</i></a><p>Thoughtful food for unhurried evenings.</p><small>© 2025 Table & Co.</small></footer>
    {(cartOpen || checkout) && <div className="overlay" onMouseDown={() => !checkout && setCartOpen(false)}><aside className={checkout ? 'drawer checkout' : 'drawer'} onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => { setCartOpen(false); setCheckout(false) }}><X/></button>{checkout ? <><p className="eyebrow"><span/> DELIVERY DETAILS</p><h2>Almost there.</h2><form onSubmit={placeOrder}><label>Name<input name="name" placeholder="Your full name"/></label><label>Phone number<input name="phone" placeholder="(555) 123-4567" type="tel"/></label><label>Delivery address<textarea name="address" placeholder="Street address, apartment or suite" rows={3}/></label>{formError && <p className="form-error">{formError}</p>}<button className="primary full" type="submit">Place order · {money(subtotal + delivery)}</button><button className="back" type="button" onClick={() => setCheckout(false)}>← Back to cart</button></form></> : <><p className="eyebrow"><span/> YOUR ORDER</p><h2>Your cart {count ? `(${count})` : 'is empty'}</h2>{cart.length === 0 ? <div className="empty"><UtensilsCrossed size={34}/><p>Add a few dishes to get started.</p></div> : <><div className="cart-lines">{cart.map(line => <div className="cart-line" key={line.id}><img src={line.image} alt=""/><div><h3>{line.name}</h3><strong>{money(line.price)}</strong><div className="quantity"><button onClick={() => quantity(line.id, -1)}><Minus size={14}/></button><span>{line.quantity}</span><button onClick={() => quantity(line.id, 1)}><Plus size={14}/></button></div></div><button className="remove" aria-label={`Remove ${line.name}`} onClick={() => setCart(lines => lines.filter(item => item.id !== line.id))}><Trash2 size={16}/></button></div>)}</div><div className="summary"><p><span>Subtotal</span><b>{money(subtotal)}</b></p><p><span>Delivery</span><b>{money(delivery)}</b></p><p className="total"><span>Total</span><b>{money(subtotal + delivery)}</b></p></div><button className="primary full" onClick={() => setCheckout(true)}>Checkout <span>→</span></button></>}</>}</aside></div>}
    {placed && <div className="overlay confirmation"><section><button className="close" onClick={() => setPlaced(false)}><X/></button><div className="success">✓</div><p className="eyebrow"><span/> ORDER CONFIRMED</p><h2>We’re on it.</h2><p className="confirm-copy">Your kitchen has received the order. We’ll keep you posted as it makes its way to you.</p><div className="tracking">{steps.map((step, index) => <div className={index <= currentStep ? 'track-step active' : 'track-step'} key={step.key}><i>{index < currentStep ? '✓' : index + 1}</i><span>{step.label}</span></div>)}</div><button className="secondary" onClick={() => setPlaced(false)}>Back to menu</button></section></div>}
  </main>
}
export default App
