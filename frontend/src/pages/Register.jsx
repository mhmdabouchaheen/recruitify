import { useEffect, useId, useState } from 'react'
import { Building2, Eye, EyeOff, UserPlus } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { registerApplicant } from '../api/auth'
import { Button, Field } from '../components/ui'
import { useAuth } from '../context/useAuth'

const passwordRequirements = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'No leading or trailing spaces',
]

function fallbackForRole(role) {
  return role === 'applicant' ? '/careers' : '/overview'
}

function destinationFromLocation(location) {
  const from = location.state?.from
  if (!from) return ''
  return `${from.pathname || ''}${from.search || ''}${from.hash || ''}` || ''
}

export default function Register() {
  const { isAuthenticated, loading, login, user } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const passwordHelpId = useId()
  const location = useLocation()
  const navigate = useNavigate()
  const from = destinationFromLocation(location)

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(from || fallbackForRole(user.role), { replace: true })
    }
  }, [from, isAuthenticated, loading, navigate, user])

  if (!loading && isAuthenticated && user) {
    return <Navigate to={from || fallbackForRole(user.role)} replace />
  }

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setApiError('')
  }

  const validate = () => {
    const nextErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.'
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (!isStrongPassword(form.password)) nextErrors.password = 'Password does not meet the requirements.'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.'
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting || !validate()) return

    setSubmitting(true)
    setApiError('')

    try {
      const email = form.email.trim().toLowerCase()
      await registerApplicant({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: form.password,
      })
      const nextUser = await login(email, form.password)
      navigate(from || fallbackForRole(nextUser.role), { replace: true })
    } catch (error) {
      setApiError(messageForRegisterError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card register-card" aria-labelledby="register-title">
        <div className="login-brand">
          <span className="brand-mark"><Building2 size={17} /></span>
          <span>Recruitify</span>
        </div>
        <div>
          <p className="eyebrow">Applicant account</p>
          <h1 id="register-title" className="page-title">Create account</h1>
          <p className="page-description">Create an applicant account to apply for published vacancies when applications open.</p>
        </div>
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="register-name-grid">
            <Field label="First name" error={errors.firstName}>
              <input autoComplete="given-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} required />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input autoComplete="family-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} required />
            </Field>
          </div>
          <Field label="Email address" error={errors.email}>
            <input autoComplete="email" inputMode="email" value={form.email} onChange={(event) => update('email', event.target.value)} required type="email" />
          </Field>
          <Field label="Password" error={errors.password}>
            <div className="password-input">
              <input aria-describedby={passwordHelpId} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} required type={showPassword ? 'text' : 'password'} />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </Field>
          <ul id={passwordHelpId} className="password-requirements">
            {passwordRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
          </ul>
          <Field label="Confirm password" error={errors.confirmPassword}>
            <div className="password-input">
              <input autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required type={showConfirmPassword ? 'text' : 'password'} />
              <button type="button" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </Field>
          {apiError && <p className="login-error" role="alert">{apiError}</p>}
          <Button icon={UserPlus} type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</Button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
      </section>
    </main>
  )
}

function isStrongPassword(password) {
  return password.length >= 8
    && password.length <= 128
    && password === password.trim()
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
}

function messageForRegisterError(error) {
  if (error.status === 409) return 'An account with this email already exists. Sign in instead.'
  if (error.status === 422) return 'Check your details and make sure your email and password are valid.'
  return error.message || 'Unable to create your account. Please try again.'
}
