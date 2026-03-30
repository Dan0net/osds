import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'walker' ? 'walker' : 'owner'
  const initialPostcode = searchParams.get('postcode') || sessionStorage.getItem('osds_postcode') || ''

  const [role, setRole] = useState(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [postcode, setPostcode] = useState(initialPostcode)
  const passwordRef = useRef(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const { signUp, resendVerification } = useAuth()
  const returnTo = searchParams.get('returnTo')
  const loginLink = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!postcode.trim()) {
      setError('Postcode is required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      // Extract walker slug from booking returnTo (e.g. /w/ellie/book)
      const bookingMatch = returnTo?.match(/\/w\/([^/]+)\/book/)
      await signUp(email, passwordRef.current.value, name, postcode.trim(), role, bookingMatch?.[1] || null)
      setConfirmed(true)
    } catch (err) {
      setError(err.message)
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

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl mb-2">Check your email</h1>
          <p className="text-gray-500 mb-6">
            We've sent a confirmation link to <span className="font-medium text-gray-700">{email}</span>. Click the link to activate your account.
          </p>
          {resent && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
              Confirmation email resent.
            </div>
          )}
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend confirmation email'}
          </button>
          <p className="text-sm text-gray-500 mt-6">
            <Link to={loginLink} className="text-indigo-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl mb-6 text-center">Create an account</h1>

      {/* Role toggle */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setRole('owner')}
          className={`flex-1 cursor-pointer py-3 text-sm font-semibold rounded-lg border-2 transition ${
            role === 'owner'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          🐾 Pet owner
        </button>
        <button
          type="button"
          onClick={() => setRole('walker')}
          className={`flex-1 cursor-pointer py-3 text-sm font-semibold rounded-lg border-2 transition ${
            role === 'walker'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          🦮 Dog walker
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Ellie"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
          <input
            type="text"
            name="postcode"
            autoComplete="postal-code"
            required
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="SW1A 1AA"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            ref={passwordRef}
            type="password"
            name="password"
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        Already have an account?{' '}
        <Link to={loginLink} className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
