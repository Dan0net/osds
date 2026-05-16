import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createCheckout, cancelBooking, apiFetch } from '../../lib/api'
import { bookingStatusBadge, toneClass } from '../../lib/bookingStatus'

export default function BookingDetail() {
  const { bookingId } = useParams()
  const { user, walkerProfile } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/bookings'
  const backLabel = (() => {
    if (from === '/account/messages') return 'Messages'
    if (from?.startsWith('/account/customers/')) return 'Customer'
    return 'Bookings'
  })()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  useEffect(() => {
    if (!user) return
    loadBooking()
  }, [user?.id, bookingId])

  async function loadBooking() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price_cents, duration_minutes, service_type),
        pets(name, breed, weight, notes),
        walker_profiles(slug, business_name, theme_color, user_id),
        payments(id, status, total_cents, source),
        users!bookings_client_id_fkey(name, email)
      `)
      .eq('id', bookingId)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }
    setBooking(data)
    setLoading(false)
  }

  const isWalker = walkerProfile && booking?.walker_profiles?.user_id === user?.id
  const isClient = booking?.client_id === user?.id

  async function handlePayNow() {
    if (!booking?.payments?.id) return
    setActionLoading('pay')
    const res = await createCheckout(booking.payments.id)
    if (res.data?.url) {
      window.location.href = res.data.url
    }
    setActionLoading(null)
  }

  async function handleCancel() {
    setActionLoading('cancel')
    const res = await cancelBooking({ booking_id: booking.id })
    if (!res.error) {
      await loadBooking()
    }
    setCancelConfirm(false)
    setActionLoading(null)
  }

  async function handleApprove() {
    setActionLoading('approve')
    const res = await apiFetch('approve-booking', {
      method: 'POST',
      body: JSON.stringify({ booking_id: booking.id }),
    })
    if (!res.error) {
      await loadBooking()
    }
    setActionLoading(null)
  }

  async function handleDecline() {
    setActionLoading('decline')
    const res = await apiFetch('decline-booking', {
      method: 'POST',
      body: JSON.stringify({ booking_id: booking.id }),
    })
    if (!res.error) {
      await loadBooking()
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">Loading booking...</div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Booking not found.</p>
        <Link
          to={backHref}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={16} /> {backLabel}
        </Link>
      </div>
    )
  }

  const cancellable = ['requested', 'approved', 'hold', 'confirmed', 'pending'].includes(booking.status)
  const canPay = isClient && booking.payments?.status === 'awaiting_payment'
  const canApprove = isWalker && booking.status === 'requested'
  const isOvernight = booking.end_date && booking.end_date !== booking.booking_date

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const serviceLink = isWalker && booking.service_id ? `/account/services/${booking.service_id}` : null
  const clientLink = isWalker && booking.client_id ? `/account/customers/${booking.client_id}` : null
  const petLink = isWalker && booking.client_id
    ? `/account/customers/${booking.client_id}`
    : isClient ? '/account/pets' : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft size={16} /> {backLabel}
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl">
              {serviceLink ? (
                <Link to={serviceLink} className="hover:underline">
                  {booking.services?.name || 'Booking'}
                </Link>
              ) : (
                booking.services?.name || 'Booking'
              )}
            </h1>
            {(() => {
              const badge = bookingStatusBadge(booking)
              return (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${toneClass(badge.tone)}`}>
                  {badge.label}
                </span>
              )
            })()}
          </div>
          <p className="text-gray-500 text-sm">
            {formatDate(booking.booking_date)}
            {isOvernight ? (
              <> &rarr; {formatDate(booking.end_date)} &middot; Drop-off {booking.start_time?.slice(0, 5)} &middot; Pick-up {booking.end_time?.slice(0, 5)}</>
            ) : (
              <> &middot; {booking.start_time?.slice(0, 5)}&ndash;{booking.end_time?.slice(0, 5)}</>
            )}
          </p>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          {/* Walker / Client info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-0.5">{isWalker ? 'Client' : 'Walker'}</span>
              {clientLink ? (
                <Link to={clientLink} className="font-medium hover:underline">
                  {booking.users?.name || 'Unknown'}
                </Link>
              ) : (
                <span className="font-medium">
                  {isWalker
                    ? booking.users?.name || 'Unknown'
                    : booking.walker_profiles?.business_name || 'Unknown'}
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block mb-0.5">Service type</span>
              <span className="font-medium capitalize">{booking.services?.service_type || 'standard'}</span>
            </div>
          </div>

          {/* Pet */}
          {booking.pets && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-0.5">Pet</span>
              {petLink ? (
                <Link to={petLink} className="font-medium hover:underline">
                  {booking.pets.name}
                  {booking.pets.breed ? ` — ${booking.pets.breed}` : ''}
                  {booking.pets.weight ? `, ${booking.pets.weight}kg` : ''}
                </Link>
              ) : (
                <span className="font-medium">
                  {booking.pets.name}
                  {booking.pets.breed ? ` — ${booking.pets.breed}` : ''}
                  {booking.pets.weight ? `, ${booking.pets.weight}kg` : ''}
                </span>
              )}
              {booking.pets.notes && (
                <p className="text-gray-500 text-xs mt-0.5">{booking.pets.notes}</p>
              )}
            </div>
          )}

          {/* Payment */}
          {booking.payments && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-0.5">Payment</span>
              <span className="font-semibold text-indigo-600">
                £{(booking.payments.total_cents / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {(canPay || canApprove || cancellable) && (
          <div className="p-5 border-t border-gray-100 flex flex-wrap gap-3">
            {canPay && (
              <button
                onClick={handlePayNow}
                disabled={actionLoading === 'pay'}
                className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === 'pay' ? 'Redirecting...' : 'Pay Now'}
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!!actionLoading}
                  className="bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'decline' ? 'Declining...' : 'Decline'}
                </button>
              </>
            )}
            {cancellable && !cancelConfirm && (
              <button
                onClick={() => setCancelConfirm(true)}
                className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50"
              >
                Cancel Booking
              </button>
            )}
            {cancelConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Are you sure?</span>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                  className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? 'Cancelling...' : 'Yes, cancel'}
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  No, keep it
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
