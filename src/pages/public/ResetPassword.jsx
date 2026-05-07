import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
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
      <div className="max-w-md mx-auto px-4 py-16 text-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!recoveryReady) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
          <p className="font-medium mb-1">This reset link is invalid or expired</p>
          <p>Request a new one to continue.</p>
        </div>
        <p className="text-sm text-center text-gray-500 mt-4">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">Request a new reset link</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl mb-6 text-center">Set a new password</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
