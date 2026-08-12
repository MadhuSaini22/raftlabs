import { useState } from 'react'
import { Clock3, MapPin, ShoppingBag } from 'lucide-react'
import { CartProvider, useCart } from './features/cart/cartContext'
import { CartDrawer } from './features/cart/CartDrawer'
import { MenuSection } from './features/menu/MenuSection'
import { OrderTracking } from './features/orders/OrderTracking'
import { OrderHistory } from './features/orders/OrderHistory'
import { addTrackedOrder, getTrackedOrders } from './features/orders/trackedOrders'
import { AdminOrders } from './features/orders/AdminOrders'
import { AdminLogin } from './features/orders/AdminLogin'
import './App.css'

const Page = () => {
  const { cart } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; trackingToken: string } | null>(null)
  const [trackedOrders, setTrackedOrders] = useState(getTrackedOrders)
  const [trackingListOpen, setTrackingListOpen] = useState(false)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const selectOrder = (order: { id: string; trackingToken: string }) => { setTrackingListOpen(false); setSelectedOrder(order) }

  return <main><header className="topbar"><a className="brand" href="#top"><span>table</span>.<i>co</i></a><nav><a href="#menu">Menu</a><a href="#how">How it works</a>{trackedOrders.length > 0 && <button className="link-button" onClick={() => setTrackingListOpen(true)}>Track order</button>}</nav><button aria-label="Open cart" className="cart-trigger" onClick={() => setCartOpen(true)}><ShoppingBag size={18}/><span>Cart</span>{count > 0 && <b>{count}</b>}</button></header><section id="top" className="hero"><div className="hero-copy"><p className="eyebrow"><span/> GOOD FOOD, DELIVERED</p><h1>Comfort food,<br/><em>thoughtfully made.</em></h1><p className="lead">Seasonal ingredients, cooked from scratch and brought straight to your door.</p><a href="#menu" className="primary">Explore the menu <span>→</span></a><div className="hero-notes"><span><Clock3 size={16}/> 25–35 min delivery</span><span><MapPin size={16}/> Downtown & nearby</span></div></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=90" alt="Freshly prepared bowl of food"/><div className="image-note"><span className="dot"/> Made fresh today</div></div></section><MenuSection/><section id="how" className="how"><p className="eyebrow"><span/> SIMPLE BY DESIGN</p><h2>Dinner, handled.</h2><div className="how-grid"><div><b>01</b><h3>Choose your favourites</h3><p>Pick from a considered menu of seasonal plates.</p></div><div><b>02</b><h3>We cook it fresh</h3><p>Your order goes straight to our kitchen.</p></div><div><b>03</b><h3>Enjoy at home</h3><p>Track your order right to your door.</p></div></div></section><footer><a className="brand" href="#top"><span>table</span>.<i>co</i></a><p>Thoughtful food for unhurried evenings.</p><small>© 2025 Table & Co.</small></footer>{cartOpen && <CartDrawer onClose={() => setCartOpen(false)} onOrderCreated={(order) => { const tracked = { id: order._id, trackingToken: order.trackingToken }; setTrackedOrders(addTrackedOrder(tracked)); setCartOpen(false); setSelectedOrder(tracked) }}/>} {trackingListOpen && <OrderHistory orders={trackedOrders} onClose={() => setTrackingListOpen(false)} onSelect={selectOrder}/>} {selectedOrder && <OrderTracking orderId={selectedOrder.id} trackingToken={selectedOrder.trackingToken} onClose={() => setSelectedOrder(null)}/>}</main>
}

export default function App() { if (window.location.pathname === '/admin/login') return <AdminLogin/>; return window.location.pathname === '/admin/orders' ? <AdminOrders/> : <CartProvider><Page/></CartProvider> }
