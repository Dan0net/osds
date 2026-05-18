import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  useStripeConnectOnboard, useStripeConnectCallback, useUpdateWalkerProfile,
} from '../../lib/queries/profile'
import { useStripeDashboardLink } from '../../lib/queries/payments'

export default function AccountStripe() {
  const { walkerProfile, refreshProfile } = useAuth()
  const onboard = useStripeConnectOnboard()
  const callback = useStripeConnectCallback()
  const dashboardLink = useStripeDashboardLink()
  const updateProfile = useUpdateWalkerProfile(walkerProfile?.id)

  const [stripeStatus, setStripeStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!walkerProfile?.stripe_account_id) return
    let cancelled = false
    callback.mutateAsync().then(async (res) => {
      if (cancelled || !res?.data) return
      setStripeStatus(res.data)
      const live = !!res.data.charges_enabled
      if (live !== walkerProfile.stripe_charges_enabled) {
        await updateProfile.mutateAsync({ stripe_charges_enabled: live })
        await refreshProfile?.()
      }
    })
    return () => { cancelled = true }
  }, [walkerProfile?.stripe_account_id])

  async function handleConnect() {
    setError(null)
    const res = await onboard.mutateAsync({ return_path: '/account/settings/stripe' })
    if (res?.data?.url) window.location.href = res.data.url
    else setError(res?.error || 'Failed to start Stripe onboarding')
  }

  async function handleDashboard() {
    const res = await dashboardLink.mutateAsync()
    if (res?.data?.url) window.open(res.data.url, '_blank')
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Payments setup is only available for walkers.</p>
  }

  const connected = stripeStatus?.charges_enabled
  const partial = walkerProfile.stripe_account_id && stripeStatus && !stripeStatus.charges_enabled
  const stripeLoading = onboard.isPending

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-2">Stripe</h3>
        <p className="text-sm text-gray-500 mb-4">
          Stripe handles all card payments and pays you out automatically. You need to complete onboarding
          before clients can pay you online.
        </p>

        {connected && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700 font-medium">Stripe connected</span>
            </div>
            <button
              type="button"
              onClick={handleDashboard}
              className="cursor-pointer border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Open Stripe Dashboard
            </button>
          </div>
        )}

        {partial && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-yellow-700 font-medium">Onboarding incomplete</span>
            </div>
            <button
              type="button"
              disabled={stripeLoading}
              onClick={handleConnect}
              className="cursor-pointer bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {stripeLoading ? 'Redirecting…' : 'Continue Stripe setup'}
            </button>
          </div>
        )}

        {!connected && !partial && (
          <div>
            <button
              type="button"
              disabled={stripeLoading}
              onClick={handleConnect}
              className="cursor-pointer bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {stripeLoading ? 'Redirecting…' : 'Connect Stripe account'}
            </button>
            <p className="text-xs text-gray-400 mt-2">Required to accept online payments.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
