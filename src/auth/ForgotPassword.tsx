import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { EMAIL_RE } from '@/utils/validators'
import { AuthShell, SubmitButton, AuthFooter, TextField } from '@/auth/AuthFormHelpers'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const { requestPasswordReset } = useAuth()

  const emailValid = EMAIL_RE.test(email.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    if (!emailValid) return
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
    <AuthShell
      title="Forgot your password? 🔑"
      subtitle="No worries — enter your email and we'll send you a link to set a new one."
    >
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-slide-up">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <SubmitButton disabled={submitting || !emailValid}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </SubmitButton>
      </form>
      <AuthFooter to="/login" linkText="Back to log in" />
    </AuthShell>
  )
}
