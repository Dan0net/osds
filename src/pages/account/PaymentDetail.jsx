import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { User, PawPrint, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createCheckout, cancelBooking, apiFetch } from '../../lib/api'
import { paymentStatusBadge, toneClass } from '../../lib/bookingStatus'
import DetailHeader from '../../components/account/DetailHeader'
import LinkRow from '../../components/account/LinkRow'
import BookingCard from '../../components/account/BookingCard'
import ConfirmModal from '../../components/ConfirmModal'

const CANCELLABLE = new Set(['requested', 'approved', 'hold', 'confirmed', 'pending'])

export default function PaymentDetail() {
  const { paymentId } = useParams()
  const { user, walkerProfile } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/money'
  const backLabel = (() => {
    if (from === '/account/messages') return 'Messages'
    if (from?.startsWith('/account/bookings')) return 'Bookings'
    return 'Money'
  })()

  const [payment, setPayment] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    load()
  }, [user?.id, paymentId])

  async function load() {
    setLoading(true)
    const [paymentRes, bookingsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, walker_profiles(slug, business_name, theme_color, user_id), users!payments_client_id_fkey(name, email)')
        .eq('id', paymentId)
        .single(),
      supabase
        .from('bookings')
        .select(`
          *,
          services(name, duration_minutes, service_type),
          pets(name, breed)
        `)
        .eq('payment_id', paymentId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true }),
    ])

    setPayment(paymentRes.data || null)
    setBookings(bookingsRes.data || [])
    setLoading(false)
  }

  const isWalker = walkerProfile && payment?.walker_profiles?.user_id === user?.id
  const isClient = payment?.client_id === user?.id

  async function handlePayNow() {
    setActionLoading('pay')
    const res = await createCheckout(paymentId)
    if (res.data?.url) {
      window.location.href = res.data.url
    }
    setActionLoading(null)
  }

  async function handleApproveAll() {
    setActionLoading('approve')
    const res = await apiFetch('approve-booking', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId }),
    })
    if (!res.error) await load()
    setActionLoading(null)
  }

  async function handleDeclineAll() {
    setActionLoading('decline')
    const res = await apiFetch('decline-booking', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId }),
    })
    if (!res.error) await load()
    setActionLoading(null)
  }

  async function handleCancel() {
    setActionLoading('cancel')
    const res = await cancelBooking({ payment_id: paymentId })
    if (!res.error) await load()
    setActionLoading(null)
    setCancelOpen(false)
  }

  if (loading) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <div className="text-center py-16 text-gray-500">Loading payment...</div>
      </>
    )
  }

  if (!payment) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-center py-16 text-gray-500">Payment not found.</p>
      </>
    )
  }

  const badge = paymentStatusBadge(payment)
  const canPay = isClient && payment.status === 'awaiting_payment'
  const anyRequested = bookings.some((b) => b.status === 'requested')
  const anyCancellable = bookings.some((b) => CANCELLABLE.has(b.status))
  const canApproveAll = isWalker && anyRequested
  const firstPet = bookings.find((b) => b.pets)?.pets
  const stateBack = { from: `/account/payments/${paymentId}` }

  return (
    <>
      <DetailHeader
        backHref={backHref}
        backLabel={backLabel}
        title={`£${(payment.total_cents / 100).toFixed(2)}`}
        right={
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${toneClass(badge.tone)}`}>
            {badge.label}
          </span>
        }
      />

      <div className="space-y-3">
        <p className="text-gray-500 text-sm px-1">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</p>

        {isWalker && payment.users && (
          <LinkRow
            icon={User}
            label="Client"
            value={payment.users.name || 'Unknown'}
            secondary={payment.users.email}
            to={payment.client_id ? `/account/customers/${payment.client_id}` : null}
            state={stateBack}
          />
        )}
        {!isWalker && payment.walker_profiles && (
          <LinkRow
            icon={User}
            label="Walker"
            value={payment.walker_profiles.business_name || 'Walker'}
          />
        )}
        {firstPet && (
          <LinkRow
            icon={PawPrint}
            label="Pet"
            value={[firstPet.name, firstPet.breed].filter(Boolean).join(' · ')}
            to={isWalker && payment.client_id
              ? `/account/customers/${payment.client_id}`
              : isClient ? '/account/pets' : null}
            state={stateBack}
          />
        )}

        <div className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 mb-2">Bookings</h2>
          <div className="space-y-2">
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                serviceName={b.services?.name}
                date={b.booking_date}
                endDate={b.end_date}
                startTime={b.start_time}
                endTime={b.end_time}
                to={`/account/bookings/${b.id}`}
                state={stateBack}
              />
            ))}
          </div>
        </div>

        {(canPay || canApproveAll) && (
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
            {canApproveAll && (
              <>
                <button
                  onClick={handleApproveAll}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve all'}
                </button>
                <button
                  onClick={handleDeclineAll}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'decline' ? 'Declining...' : 'Decline all'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {anyCancellable && (
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
        title={bookings.length > 1 ? 'Cancel all bookings?' : 'Cancel this booking?'}
        body={payment.status === 'paid'
          ? 'The payment will be refunded.'
          : 'This will free up the slot(s). You can rebook later if needed.'}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep it"
        confirmTone="danger"
        loading={actionLoading === 'cancel'}
      />
    </>
  )
}
