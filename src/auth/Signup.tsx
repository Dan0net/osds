import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { EMAIL_RE, UK_POSTCODE_RE } from '@/utils/validators'
import { AuthShell, SubmitButton, AuthFooter, TextField } from '@/auth/AuthFormHelpers'
import Alert from '@/shared/Alert'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole = roleParam === 'walker' ? 'walker' : roleParam === 'owner' ? 'owner' : null
  const initialPostcode = searchParams.get('postcode') || sessionStorage.getItem('osds_postcode') || ''

  const [role, setRole] = useState(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [postcode, setPostcode] = useState(initialPostcode)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const { signUp, resendVerification } = useAuth()
  const returnTo = searchParams.get('returnTo')
  const loginLink = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  const nameValid = name.trim().length >= 2
  const emailValid = EMAIL_RE.test(email.trim())
  const postcodeValid = UK_POSTCODE_RE.test(postcode.trim().toUpperCase())
  const passwordValid = password.length >= 8
  const formValid = nameValid && emailValid && postcodeValid && passwordValid

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formValid) return
    setError(null)
    setSubmitting(true)
    try {
      const bookingMatch = returnTo?.match(/\/w\/([^/]+)\/book/)
      await signUp(email, password, name, postcode.trim(), role, bookingMatch?.[1] || null)
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

  const subtitle =
    role === 'walker'
      ? "Let's get your walking business set up."
      : role === 'owner'
      ? "Let's find the perfect walker for your pup."
      : 'Tell us who you are to get started.'

  return (
    <AuthShell title="Join the pack 🐾" subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <RoleButton selected={role === 'owner'} onClick={() => setRole('owner')} icon="🐾" label="Pet owner" />
        <RoleButton selected={role === 'walker'} onClick={() => setRole('walker')} icon="🦮" label="Dog walker" />
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {role && (
        <form
          key={role}
          onSubmit={handleSubmit}
          className="space-y-4 animate-fade-slide-up"
        >
          <TextField
            label="Your name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ellie"
          />
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <TextField
            label="Postcode"
            name="postcode"
            autoComplete="postal-code"
            required
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            placeholder="SW1A 1AA"
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <SubmitButton disabled={submitting || !formValid}>
            {submitting ? 'Creating account…' : 'Create account'}
          </SubmitButton>
        </form>
      )}

      <AuthFooter prefix="Already have an account?" to={loginLink} linkText="Log in" />
    </AuthShell>
  )
}

function RoleButton({ selected, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer flex flex-col items-center justify-center py-6 sm:py-7 px-3 rounded-xl border-2 transition ${
        selected
          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
      }`}
    >
      <span className="text-3xl sm:text-4xl mb-2">{icon}</span>
      <span className="font-semibold text-base sm:text-lg">{label}</span>
    </button>
  )
}
