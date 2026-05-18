import { useState, useEffect } from 'react'
import { useAuth } from '@/auth/useAuth'
import {
  useStripeConnectOnboard, useStripeConnectCallback, useStripeConnectDisconnect, useUpdateWalkerProfile,
} from '@/queries/profile'
import { useStripeDashboardLink } from '@/queries/payments'
import Button from '@/shared/form/Button'
import Alert from '@/shared/Alert'
import ConfirmModal from '@/shared/modal/ConfirmModal'

const REQUIREMENT_LABELS: Record<string, string> = {
  'external_account': 'Bank account',
  'tos_acceptance.date': 'Accept terms of service',
  'tos_acceptance.ip': 'Accept terms of service',
  'business_profile.url': 'Business website',
  'business_profile.mcc': 'Business category',
  'business_profile.product_description': 'Business description',
  'individual.verification.document': 'ID document',
  'individual.verification.additional_document': 'Additional ID document',
  'individual.dob.day': 'Date of birth',
  'individual.dob.month': 'Date of birth',
  'individual.dob.year': 'Date of birth',
  'individual.address.line1': 'Address',
  'individual.address.city': 'Address',
  'individual.address.postal_code': 'Address',
  'individual.first_name': 'Legal name',
  'individual.last_name': 'Legal name',
  'individual.email': 'Email',
  'individual.phone': 'Phone number',
}

function humanRequirements(keys: string[]): string[] {
  return Array.from(new Set(keys.map((k) => REQUIREMENT_LABELS[k] || k)))
}

export default function AccountStripe() {
  const { walkerProfile, refreshProfile } = useAuth()
  const onboard = useStripeConnectOnboard()
  const callback = useStripeConnectCallback()
  const disconnect = useStripeConnectDisconnect()
  const dashboardLink = useStripeDashboardLink()
  const updateProfile = useUpdateWalkerProfile(walkerProfile?.id)

  const [stripeStatus, setStripeStatus] = useState(null)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

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

  async function handleDisconnect() {
    setError(null)
    const res = await disconnect.mutateAsync()
    setConfirmOpen(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    setStripeStatus(null)
    await refreshProfile?.()
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
            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleDashboard} variant="secondary" size="sm">
                Open Stripe Dashboard
              </Button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-xs text-gray-500 hover:text-red-600 underline"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {partial && (() => {
          const due = humanRequirements([...(stripeStatus?.currently_due || []), ...(stripeStatus?.past_due || [])])
          const pending = humanRequirements(stripeStatus?.pending_verification || [])
          const reviewOnly = due.length === 0 && pending.length > 0
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-yellow-700 font-medium">
                  {reviewOnly ? 'Pending Stripe review' : 'Onboarding incomplete'}
                </span>
              </div>
              {reviewOnly ? (
                <p className="text-sm text-gray-600">
                  Stripe is reviewing: {pending.join(', ')}. You'll be notified once approved — no action needed.
                </p>
              ) : (
                <>
                  {due.length > 0 && (
                    <p className="text-sm text-gray-600">
                      Still needed: <span className="font-medium">{due.join(', ')}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <Button type="button" disabled={stripeLoading} onClick={handleConnect} size="sm">
                      {stripeLoading ? 'Redirecting…' : 'Continue Stripe setup'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(true)}
                      className="text-xs text-gray-500 hover:text-red-600 underline"
                    >
                      Start over
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {!connected && !partial && (
          <div>
            <Button type="button" disabled={stripeLoading} onClick={handleConnect} size="sm">
              {stripeLoading ? 'Redirecting…' : 'Connect Stripe account'}
            </Button>
            <p className="text-xs text-gray-400 mt-2">Required to accept online payments.</p>
          </div>
        )}

        {error && <Alert className="mt-4">{error}</Alert>}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Stripe?"
        body={connected
          ? "You won't be able to take online payments until you reconnect. Re-connecting creates a new Stripe account — past payouts and history stay in your existing Stripe Dashboard."
          : "This clears your incomplete Stripe account. You'll start fresh next time you click Connect."}
        confirmLabel="Disconnect"
        confirmTone="danger"
        loading={disconnect.isPending}
      />
    </div>
  )
}
