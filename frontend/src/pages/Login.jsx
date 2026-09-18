import { useEffect, useState } from 'react'
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button, Field } from '../components/ui'
import { useAuth } from '../context/useAuth'

function fallbackForRole(role) {
  return role === 'applicant' ? '/careers' : '/overview'
}

export default function Login() {
  const { isAuthenticated, loading, login, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const fromLocation = location.state?.from
  const from = fromLocation ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}` : ''

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(from || fallbackForRole(user.role), { replace: true })
    }
  }, [from, isAuthenticated, loading, navigate, user])

  if (!loading && isAuthenticated && user) {
    return <Navigate to={from || fallbackForRole(user.role)} replace />
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const nextUser = await login(email, password)
      navigate(from || fallbackForRole(nextUser.role), { replace: true })
    } catch (requestError) {
      setError(requestError.status === 401
        ? 'Invalid email or password.'
        : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="login-title">
        <AuthBrandPanel title="Welcome Back!" copy="Find the right talent. Build a better tomorrow." />
        <div className="auth-form-panel">
          <div className="auth-top-link">New here? <Link to="/register" state={location.state}>Sign up</Link></div>
          <div className="auth-form-wrap">
            <div className="auth-heading"><h1 id="login-title">Login to your account</h1><p>Enter your credentials to continue</p></div>
            <form className="login-form" onSubmit={submit}>
              <Field label="Email"><div className="auth-input"><Mail size={17} /><input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" /></div></Field>
              <Field label="Password"><div className="auth-input password-input"><Lock size={17} /><input autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required type={showPassword ? 'text' : 'password'} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
              {error && <p className="login-error" role="alert">{error}</p>}
              <Button icon={ArrowRight} type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Log in'}</Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}

function AuthBrandPanel({ title, copy }) {
  return <aside className="auth-brand-panel"><div className="auth-brand-mark"><span className="brand-mark"><Building2 size={17} /></span><span>Recruitify</span></div><div className="auth-brand-copy"><span className="auth-kicker" /><h2>{title}</h2><p>{copy}</p></div><p className="auth-brand-footer">PEOPLE • OPPORTUNITIES • GROWTH</p></aside>
}
