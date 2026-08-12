import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'

export const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try { await api.login(email, password); window.location.assign('/admin/orders') } catch { setError('Invalid email or password. Please try again.') } finally { setIsSubmitting(false) }
  }
  return <main className="admin-shell admin-login"><section className="admin-login-card"><a className="brand" href="/"><span>table</span>.<i>co</i></a><p className="eyebrow"><span/> ADMIN PORTAL</p><h1>Welcome back.</h1><p className="admin-intro">Sign in to manage incoming orders and delivery progress.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="admin-primary" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button></form></section></main>
}
