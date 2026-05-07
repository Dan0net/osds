import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const { requestPasswordReset } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
    } catch (err) {
      // Swallow to avoid revealing whether the email exists.
      console.error('Password reset request failed:', err)
    } finally {
      setSent(true)
      setSubmitting(false)
    }
  }

  if (sent) {
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
            If an account exists for <span className="font-medium text-gray-700">{email}</span>, we've sent a link to reset your password.
          </p>
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-indigo-600 hover:underline">Back to log in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl mb-2 text-center">Reset your password</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Enter your email and we'll send you a link to set a new password.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        <Link to="/login" className="text-indigo-600 hover:underline">Back to log in</Link>
      </p>
    </div>
  )
}
