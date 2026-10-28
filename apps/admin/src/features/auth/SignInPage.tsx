import { useState } from 'react'
import type { FormEvent } from 'react'
import { signIn, type AuthResponse } from '../../api/auth'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { Theme } from '../../theme/useTheme'

export function SignInPage({ onAuthenticated, theme, onToggleTheme }: { onAuthenticated: (session: AuthResponse) => void; theme: Theme; onToggleTheme: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const session = await signIn(email, password)
      setPassword('')
      onAuthenticated(session)
    } catch (cause) {
      setPassword('')
      setError(cause instanceof Error ? cause.message : 'Sign-in could not be completed. Try again.')
    } finally { setSubmitting(false) }
  }
  return <main className="signin-page">
    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    <section className="signin-card" aria-labelledby="signin-title">
      <img className="signin-logo" src="/rxb-logo-transparent.png" alt="RXB Laptops / Tech" />
      <span className="signin-kicker">ADMINISTRATION</span>
      <h1 id="signin-title">Welcome back</h1>
      <p className="signin-subtitle">Sign in to manage your store.</p>
      <form className="signin-form" onSubmit={submit}>
        <label htmlFor="signin-email">Email address</label>
        <input id="signin-email" type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} />
        <div className="signin-password-label"><label htmlFor="signin-password">Password</label><button type="button" onClick={() => setVisible(value => !value)} aria-controls="signin-password" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button></div>
        <input id="signin-password" type={visible ? 'text' : 'password'} name="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={submitting} />
        {error && <p className="signin-error" role="alert">{error}</p>}
        <button className="signin-submit" type="submit" disabled={submitting}>{submitting ? <><span className="signin-spinner" aria-hidden="true" />Signing in…</> : 'Sign in'}</button>
      </form>
      <p className="signin-foot">Authorized RXB administrators only</p>
    </section>
  </main>
}
