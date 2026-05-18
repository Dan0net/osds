import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/auth/useAuth'
import { AuthShell, SubmitButton, TextField, ErrorBanner } from '@/auth/AuthFormHelpers'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  useEffect(() => {
    let resolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        resolved = true
        setRecoveryReady(true)
        setChecking(false)
      }
    })

    // Fallback: if Supabase has already processed the recovery hash before our
    // listener attached, the event won't fire — check the current session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resolved) return
      if (session) setRecoveryReady(true)
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const passwordValid = password.length >= 8
  const matches = password === confirm && confirm.length > 0
  const formValid = passwordValid && matches

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!passwordValid) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!matches) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/account')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <AuthShell>
        <p className="text-center text-gray-500">Loading…</p>
      </AuthShell>
    )
  }

  if (!recoveryReady) {
    return (
      <AuthShell>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
          <p className="font-medium mb-1">This reset link is invalid or expired</p>
          <p>Request a new one to continue.</p>
        </div>
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Set a new password 🔒"
      subtitle="Choose something memorable — at least 8 characters."
    >
      <ErrorBanner>{error}</ErrorBanner>
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-slide-up">
        <TextField
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <TextField
          label="Confirm new password"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
        />
        <SubmitButton disabled={submitting || !formValid}>
          {submitting ? 'Updating…' : 'Update password'}
        </SubmitButton>
      </form>
    </AuthShell>
  )
}
