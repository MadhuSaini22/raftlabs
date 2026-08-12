import { Minus, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useCart } from '../cart/cartContext'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const MenuSection = () => {
  const { add, cart, change } = useCart()
  const { data: menu = [], isLoading, isError } = useQuery({ queryKey: ['menu'], queryFn: api.getMenu })
  return <section id="menu" className="menu-section"><div className="section-heading"><div><p className="eyebrow"><span/> TODAY’S KITCHEN</p><h2>A little something<br/>for every appetite.</h2></div><p>Our menu changes with the seasons, but it’s always made with care.</p></div>{isLoading && <p role="status">Loading today’s menu…</p>}{isError && <p role="alert">We couldn’t load the menu. Please try again shortly.</p>}{!isLoading && !isError && menu.length === 0 && <p role="status">The kitchen is updating today’s menu.</p>}<div className="menu-grid">{menu.map((item) => { const line = cart.find(({ _id }) => _id === item._id); return <article className="dish" key={item._id}><div className="dish-image"><img src={item.image} alt={item.name}/>{!item.available && <small>Unavailable</small>}</div><div className="dish-details"><div><h3>{item.name}</h3><p>{item.category}</p><p>{item.description}</p></div><div className="dish-bottom"><strong>{money(item.price)}</strong><div style={{ width: 104, display: 'flex', justifyContent: 'flex-end' }}>{!item.available ? <button disabled>Unavailable</button> : line ? <div className="quantity"><button aria-label={`Decrease ${item.name} from menu`} onClick={() => change(item._id, -1)}><Minus size={14}/></button><span>{line.quantity}</span><button aria-label={`Increase ${item.name} from menu`} onClick={() => change(item._id, 1)}><Plus size={14}/></button></div> : <button aria-label={`Add ${item.name} to cart`} onClick={() => add(item)}>Add <Plus size={16}/></button>}</div></div></div></article>})}</div></section>
}
