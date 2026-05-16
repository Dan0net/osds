import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { User, PawPrint, Scissors, CreditCard, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createCheckout, cancelBooking, apiFetch } from '../../lib/api'
import { bookingStatusBadge, toneClass } from '../../lib/bookingStatus'
import DetailHeader from '../../components/account/DetailHeader'
import LinkRow from '../../components/account/LinkRow'
import ConfirmModal from '../../components/ConfirmModal'

export default function BookingDetail() {
  const { bookingId } = useParams()
  const { user, walkerProfile } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/bookings'
  const backLabel = (() => {
    if (from === '/account/messages') return 'Messages'
    if (from?.startsWith('/account/customers/')) return 'Customer'
    if (from?.startsWith('/account/payments/')) return 'Payment'
    return 'Bookings'
  })()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)

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
    setActionLoading(null)
    setCancelOpen(false)
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
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <div className="text-center py-16 text-gray-500">Loading booking...</div>
      </>
    )
  }

  if (!booking) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-center py-16 text-gray-500">Booking not found.</p>
      </>
    )
  }

  const cancellable = ['requested', 'approved', 'hold', 'confirmed', 'pending'].includes(booking.status)
  const canPay = isClient && booking.payments?.status === 'awaiting_payment'
  const canApprove = isWalker && booking.status === 'requested'
  const isOvernight = booking.end_date && booking.end_date !== booking.booking_date

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const badge = bookingStatusBadge(booking)

  return (
    <>
      <DetailHeader
        backHref={backHref}
        backLabel={backLabel}
        title={booking.services?.name || 'Booking'}
        right={
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${toneClass(badge.tone)}`}>
            {badge.label}
          </span>
        }
      />

      <div className="space-y-3">
        <p className="text-gray-500 text-sm px-1">
          {formatDate(booking.booking_date)}
          {isOvernight ? (
            <> &rarr; {formatDate(booking.end_date)} &middot; Drop-off {booking.start_time?.slice(0, 5)} &middot; Pick-up {booking.end_time?.slice(0, 5)}</>
          ) : (
            <> &middot; {booking.start_time?.slice(0, 5)}&ndash;{booking.end_time?.slice(0, 5)}</>
          )}
        </p>

        {isWalker && booking.users && (
          <LinkRow
            icon={User}
            label="Client"
            value={booking.users.name || 'Unknown'}
            secondary={booking.users.email}
            to={booking.client_id ? `/account/customers/${booking.client_id}` : null}
            state={{ from: `/account/bookings/${booking.id}` }}
          />
        )}
        {!isWalker && booking.walker_profiles && (
          <LinkRow
            icon={User}
            label="Walker"
            value={booking.walker_profiles.business_name || 'Walker'}
          />
        )}
        {booking.pets && (
          <LinkRow
            icon={PawPrint}
            label="Pet"
            value={[
              booking.pets.name,
              booking.pets.breed,
              booking.pets.weight ? `${booking.pets.weight}kg` : null,
            ].filter(Boolean).join(' · ')}
            secondary={booking.pets.notes}
            to={isWalker && booking.client_id
              ? `/account/customers/${booking.client_id}`
              : isClient ? '/account/pets' : null}
            state={{ from: `/account/bookings/${booking.id}` }}
          />
        )}
        {booking.services && (
          <LinkRow
            icon={Scissors}
            label="Service"
            value={booking.services.name}
            secondary={booking.services.service_type ? `${booking.services.service_type} · ${booking.services.duration_minutes} min` : null}
            to={isWalker && booking.service_id ? `/account/services/${booking.service_id}` : null}
            state={{ from: `/account/bookings/${booking.id}` }}
          />
        )}
        {booking.payments && (
          <LinkRow
            icon={CreditCard}
            label="Payment"
            value={`£${(booking.payments.total_cents / 100).toFixed(2)}`}
            secondary={booking.payments.source === 'cash' ? 'Cash on arrival' : 'Online'}
            to={`/account/payments/${booking.payments.id}`}
            state={{ from: `/account/bookings/${booking.id}` }}
          />
        )}

        {(canPay || canApprove) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-5 flex flex-wrap gap-2">
            {canPay && (
              <button
                onClick={handlePayNow}
                disabled={actionLoading === 'pay'}
                className="cursor-pointer bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === 'pay' ? 'Redirecting...' : 'Pay now'}
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'decline' ? 'Declining...' : 'Decline'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {cancellable && (
        <button
          onClick={() => setCancelOpen(true)}
          className="cursor-pointer mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded-lg"
        >
          <Trash2 size={16} />
          Cancel booking
        </button>
      )}

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel this booking?"
        body={booking.payments?.status === 'paid'
          ? 'The payment will be refunded.'
          : 'This will free up the slot. You can rebook later if needed.'}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep it"
        confirmTone="danger"
        loading={actionLoading === 'cancel'}
      />
    </>
  )
}
