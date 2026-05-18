import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { EMAIL_RE } from '@/utils/validators'
import { AuthShell, SubmitButton, AuthFooter, TextField, ErrorBanner } from '@/shared/Auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn, resendVerification } = useAuth()

  useEffect(() => {
    const returnTo = searchParams.get('returnTo')
    if (returnTo) sessionStorage.setItem('osds_returnTo', returnTo)
  }, [searchParams])

  const emailValid = EMAIL_RE.test(email.trim())
  const formValid = emailValid && password.length > 0

  const returnTo = searchParams.get('returnTo')
  const signupLink = returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNeedsConfirmation(false)
    setSubmitting(true)
    try {
      await signIn(email, password)
      const dest = sessionStorage.getItem('osds_returnTo') || '/account'
      sessionStorage.removeItem('osds_returnTo')
      navigate(dest)
    } catch (err) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirmation(true)
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResent(false)
    try {
      await resendVerification(email)
      setResent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell title="Welcome back 👋" subtitle="Log in to manage your bookings and walks.">
      <ErrorBanner>{error}</ErrorBanner>
      {needsConfirmation && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
          <p className="font-medium mb-1">Please verify your email first</p>
          <p className="mb-2">Check your inbox for a confirmation link before signing in.</p>
          {resent && (
            <p className="text-green-700 mb-2">Confirmation email resent.</p>
          )}
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-amber-900 underline hover:no-underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend confirmation email'}
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-slide-up">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <div>
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="text-right mt-2">
            <Link to="/forgot-password" className="inline-block py-1 text-base sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton disabled={submitting || !formValid}>
          {submitting ? 'Logging in…' : 'Log in'}
        </SubmitButton>
      </form>

      <AuthFooter prefix="Don't have an account?" to={signupLink} linkText="Sign up" />
    </AuthShell>
  )
}
