import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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

  // Capture returnTo from query params for post-login redirect
  useEffect(() => {
    const returnTo = searchParams.get('returnTo')
    if (returnTo) sessionStorage.setItem('osds_returnTo', returnTo)
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNeedsConfirmation(false)
    setSubmitting(true)
    try {
      await signIn(email, password)
      const returnTo = sessionStorage.getItem('osds_returnTo') || '/account'
      sessionStorage.removeItem('osds_returnTo')
      navigate(returnTo)
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
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl mb-6 text-center">Log in</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="••••••••"
          />
          <div className="text-right mt-1">
            <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        Don't have an account?{' '}
        <Link to={searchParams.get('returnTo') ? `/signup?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : '/signup'} className="text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
