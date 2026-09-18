import { useEffect, useState } from 'react'
import { Building2, LogIn } from 'lucide-react'
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
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark"><Building2 size={17} /></span>
          <span>Recruitify</span>
        </div>
        <div>
          <p className="eyebrow">Secure workspace</p>
          <h1 id="login-title" className="page-title">Sign in</h1>
          <p className="page-description">Access your recruiting dashboard and job vacancy workspace.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <Field label="Email address">
            <input
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
            />
          </Field>
          <Field label="Password">
            <input
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
            />
          </Field>
          {error && <p className="login-error" role="alert">{error}</p>}
          <Button icon={LogIn} type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="auth-switch">Don't have an account? <Link to="/register" state={location.state}>Create account</Link></p>
      </section>
    </main>
  )
}



