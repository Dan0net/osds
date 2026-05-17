import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { User, PawPrint, Scissors, CreditCard, Trash2, Map, MessageCircle, ChevronLeft, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createCheckout, cancelBooking, apiFetch } from '../../lib/api'
import { bookingStatusBadge } from '../../lib/bookingStatus'
import { displayServicePrice, displayPaymentAmount } from '../../lib/utils'
import { ensureConversation } from '../../lib/messaging'
import DetailHeader from '../../components/account/DetailHeader'
import DetailHero from '../../components/account/DetailHero'
import LinkRow from '../../components/account/LinkRow'
import ConfirmModal from '../../components/ConfirmModal'

export default function BookingDetail() {
  const { bookingId } = useParams()
  const { user, walkerProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/bookings'
  const backLabel = (() => {
    if (from === '/account/messages') return 'Messages'
    if (from?.startsWith('/account/customers/')) return 'Customer'
    if (from?.startsWith('/account/money/') || from?.startsWith('/account/payments/')) return 'Payment'
    return 'Bookings'
  })()
  const [booking, setBooking] = useState(null)
  const [siblings, setSiblings] = useState([])
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
        payments(id, status, total_cents, platform_fee_cents, refunded_amount_cents, source),
        users!bookings_client_id_fkey(name, email, phone, postcode)
      `)
      .eq('id', bookingId)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }
    setBooking(data)

    if (data.payment_id) {
      const { data: sibs } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('payment_id', data.payment_id)
      setSiblings(sibs || [])
    } else {
      setSiblings([])
    }
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
        <div className="text-center py-16 text-gray-500">Loading booking…</div>
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
    new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const badge = bookingStatusBadge(booking)
  const heroPrimary = isOvernight
    ? `${formatDate(booking.booking_date)} → ${formatDate(booking.end_date)}`
    : `${formatDate(booking.booking_date)} · ${booking.start_time?.slice(0, 5)}${booking.end_time ? `–${booking.end_time.slice(0, 5)}` : ''}`
  const servicePriceCents = displayServicePrice(booking.services, isWalker)
  const paymentAmountCents = booking.payments ? displayPaymentAmount(booking.payments, isWalker) : null

  // Orphan flag: this booking is cancelled but the payment still has active siblings
  const activeSiblings = siblings.filter((s) =>
    s.id !== booking.id && !['cancelled', 'declined', 'refunded'].includes(s.status),
  )
  const isOrphan = ['cancelled', 'refunded'].includes(booking.status)
    && booking.payments?.status === 'awaiting_payment'
    && activeSiblings.length > 0

  return (
    <>
      <Link
        to="/account/bookings"
        className="hidden lg:inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 mb-3 -ml-1"
      >
        <ChevronLeft size={18} />
        Back to calendar
      </Link>
      <DetailHeader backHref={backHref} backLabel={backLabel} />

      <DetailHero
        icon={Calendar}
        tone={badge.tone}
        primary={heroPrimary}
        status={badge.label}
        secondary={booking.services?.name || 'Booking'}
        extra={siblings.length > 1 && (
          <Link
            to={`/account/money/${booking.payment_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium underline opacity-80 hover:opacity-100"
          >
            1 of {siblings.length} bookings on payment →
          </Link>
        )}
      />

      <div className="space-y-3">
        {isWalker && booking.users?.postcode && (
          <LinkRow
            icon={Map}
            value="Get directions"
            secondary={booking.users.postcode}
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.users.postcode)}`}
          />
        )}
        {isWalker && booking.users && (
          <LinkRow
            icon={User}
            label="Client"
            value={booking.users.name || 'Unknown'}
            secondary={[booking.users.email, booking.users.phone].filter(Boolean).join(' · ')}
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
        {booking.walker_id && booking.client_id && (
          <LinkRow
            icon={MessageCircle}
            value="Message"
            secondary={isWalker
              ? (booking.users?.name || 'Customer')
              : (booking.walker_profiles?.business_name || 'Walker')}
            onClick={async () => {
              const id = await ensureConversation(booking.walker_id, booking.client_id)
              if (id) navigate(`/account/messages/${id}`)
            }}
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
            right={
              servicePriceCents != null && (
                <span className="text-sm font-semibold text-gray-900">
                  £{(servicePriceCents / 100).toFixed(2)}
                </span>
              )
            }
          />
        )}
        {booking.payments && (
          <LinkRow
            icon={CreditCard}
            label="Payment"
            value={paymentAmountCents != null ? `£${(paymentAmountCents / 100).toFixed(2)}` : ''}
            secondary={
              isOrphan
                ? 'This booking is cancelled — payment now covers remaining bookings only'
                : (booking.payments.source === 'cash' ? 'Cash on arrival' : 'Online')
            }
            to={`/account/money/${booking.payments.id}`}
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
                {actionLoading === 'pay' ? 'Redirecting…' : 'Pay now'}
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'approve' ? 'Approving…' : 'Approve'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'decline' ? 'Declining…' : 'Decline'}
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
          ? (siblings.length > 1
              ? 'A partial refund will be issued for this booking.'
              : 'The payment will be refunded in full.')
          : siblings.length > 1
            ? 'This booking will be removed; the payment total will reduce to the remaining bookings.'
            : 'This will free up the slot. You can rebook later if needed.'}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep it"
        confirmTone="danger"
        loading={actionLoading === 'cancel'}
      />
    </>
  )
}
