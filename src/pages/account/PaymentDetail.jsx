import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { User, PawPrint, CreditCard, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { createCheckout, cancelBooking, apiFetch } from '../../lib/api'
import { paymentStatusBadge, bookingStatusBadge, toneClass, toneColor } from '../../lib/bookingStatus'
import { displayPaymentAmount, displayServicePrice } from '../../lib/utils'
import { markPaymentRead } from '../../lib/payments'
import DetailHeader from '../../components/account/DetailHeader'
import DetailHero from '../../components/account/DetailHero'
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
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelAllOpen, setCancelAllOpen] = useState(false)
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null)

  useEffect(() => {
    if (!user) return
    load()
    markPaymentRead(paymentId, user.id)
  }, [user?.id, paymentId])

  async function load() {
    setLoading(true)
    const [paymentRes, bookingsRes, refundsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, walker_profiles(slug, business_name, theme_color, user_id), users!payments_client_id_fkey(name, email)')
        .eq('id', paymentId)
        .single(),
      supabase
        .from('bookings')
        .select(`
          *,
          services(name, price_cents, duration_minutes, service_type),
          pets(name, breed)
        `)
        .eq('payment_id', paymentId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('refunds')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true }),
    ])

    setPayment(paymentRes.data || null)
    setBookings(bookingsRes.data || [])
    setRefunds(refundsRes.data || [])
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
    if (!res.error) {
      window.dispatchEvent(new Event('account-data-mutated'))
      await load()
    }
    setActionLoading(null)
  }

  async function handleDeclineAll() {
    setActionLoading('decline')
    const res = await apiFetch('decline-booking', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId }),
    })
    if (!res.error) {
      window.dispatchEvent(new Event('account-data-mutated'))
      await load()
    }
    setActionLoading(null)
  }

  async function handleCancelAll() {
    setActionLoading('cancel')
    const res = await cancelBooking({ payment_id: paymentId })
    if (!res.error) {
      window.dispatchEvent(new Event('account-data-mutated'))
      await load()
    }
    setActionLoading(null)
    setCancelAllOpen(false)
  }

  async function handleCancelOne() {
    if (!cancelBookingTarget) return
    setActionLoading('cancel')
    const res = await cancelBooking({ booking_id: cancelBookingTarget.id })
    if (!res.error) {
      window.dispatchEvent(new Event('account-data-mutated'))
      await load()
    }
    setActionLoading(null)
    setCancelBookingTarget(null)
  }

  // Group refunds by booking id for inline display
  const refundsByBooking = useMemo(() => {
    const map = new Map()
    const unattributed = []
    for (const r of refunds) {
      if (r.status !== 'succeeded' && r.status !== 'pending') continue
      const ids = Array.isArray(r.booking_ids) ? r.booking_ids : []
      if (ids.length === 0) {
        unattributed.push(r)
        continue
      }
      const perBooking = Math.round(r.amount_cents / ids.length)
      for (const bid of ids) {
        if (!map.has(bid)) map.set(bid, [])
        map.get(bid).push({ ...r, amount_cents: perBooking })
      }
    }
    return { perBooking: map, unattributed }
  }, [refunds])

  if (loading) {
    return <p className="text-center py-16 text-gray-500">Loading payment…</p>
  }

  if (!payment) {
    return <p className="text-center py-16 text-gray-500">Payment not found.</p>
  }

  const badge = paymentStatusBadge(payment)
  const canPay = isClient && payment.status === 'awaiting_payment'
  const anyRequested = bookings.some((b) => b.status === 'requested')
  const anyCancellable = bookings.some((b) => CANCELLABLE.has(b.status))
  const someAlreadyCancelled = bookings.some((b) => ['cancelled', 'refunded'].includes(b.status))
  const canApproveAll = isWalker && anyRequested
  const firstPet = bookings.find((b) => b.pets)?.pets
  const stateBack = { from: `/account/money/${paymentId}` }

  const displayAmount = displayPaymentAmount(payment, isWalker)
  const displayRefunded = isWalker
    ? Math.round(((payment.refunded_amount_cents || 0) * (payment.total_cents - (payment.platform_fee_cents || 0))) / Math.max(1, payment.total_cents))
    : (payment.refunded_amount_cents || 0)
  const displayTotal = isWalker
    ? (payment.total_cents - (payment.platform_fee_cents || 0))
    : payment.total_cents
  const counterpartyName = isWalker
    ? (payment.users?.name || 'Client')
    : (payment.walker_profiles?.business_name || 'Walker')
  const requestedDate = new Date(payment.created_at).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const payNowButton = canPay ? (
    <button
      onClick={handlePayNow}
      disabled={actionLoading === 'pay'}
      className="cursor-pointer bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
    >
      {actionLoading === 'pay' ? 'Redirecting…' : 'Pay now'}
    </button>
  ) : null

  return (
    <>
      <DetailHeader backHref={backHref} backLabel={backLabel} />

      <DetailHero
        icon={CreditCard}
        tone={badge.tone}
        primary={`£${(displayAmount / 100).toFixed(2)}`}
        status={badge.label}
        secondary={`${isWalker ? 'From' : 'To'} ${counterpartyName} · Requested ${requestedDate}`}
        extra={
          (payment.refunded_amount_cents || 0) > 0 && (
            <p className="text-sm">
              Refunded £{(displayRefunded / 100).toFixed(2)} of £{(displayTotal / 100).toFixed(2)}
            </p>
          )
        }
        action={payNowButton}
      />

      <div className="space-y-3">
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 mb-2">
            Bookings ({bookings.length})
          </h2>
          <div className="space-y-2">
            {bookings.map((b) => {
              const bWithSource = { ...b, payments: { source: payment.source } }
              const bookingBadge = bookingStatusBadge(bWithSource)
              const bRefunds = refundsByBooking.perBooking.get(b.id) || []
              const priceCents = displayServicePrice(b.services, isWalker)
              const cancellable = CANCELLABLE.has(b.status) && (isWalker || isClient)
              return (
                <BookingCard
                  key={b.id}
                  serviceName={b.services?.name}
                  date={b.booking_date}
                  endDate={b.end_date}
                  startTime={b.start_time}
                  endTime={b.end_time}
                  to={`/account/bookings/${b.id}`}
                  state={stateBack}
                  accentColor={toneColor(bookingBadge.tone)}
                  statusBadge={
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${toneClass(bookingBadge.tone)}`}>
                      {bookingBadge.label}
                    </span>
                  }
                  right={
                    priceCents != null && priceCents !== 0 && (
                      <span className="text-sm font-semibold text-gray-900">
                        £{(priceCents / 100).toFixed(2)}
                      </span>
                    )
                  }
                  onCancel={cancellable ? () => setCancelBookingTarget(b) : undefined}
                >
                  {bRefunds.length > 0 && (
                    <div className="mt-2 pl-[3.5rem] space-y-0.5">
                      {bRefunds.map((r) => (
                        <p key={r.id} className="text-xs text-gray-500">
                          Refunded £{(r.amount_cents / 100).toFixed(2)} on {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {r.status === 'pending' && ' (pending)'}
                        </p>
                      ))}
                    </div>
                  )}
                </BookingCard>
              )
            })}

            {refundsByBooking.unattributed.map((r) => (
              <div key={r.id} className="block bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <CreditCard size={14} className="text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Manual refund — unattributed</p>
                    <p className="text-xs text-gray-500">
                      £{(r.amount_cents / 100).toFixed(2)} on {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {canApproveAll && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-5 flex flex-wrap gap-2">
            <button
              onClick={handleApproveAll}
              disabled={!!actionLoading}
              className="cursor-pointer bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'approve' ? 'Approving…' : 'Approve all'}
            </button>
            <button
              onClick={handleDeclineAll}
              disabled={!!actionLoading}
              className="cursor-pointer bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === 'decline' ? 'Declining…' : 'Decline all'}
            </button>
          </div>
        )}
      </div>

      {anyCancellable && (
        <button
          onClick={() => setCancelAllOpen(true)}
          disabled={!!actionLoading}
          className="cursor-pointer mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Trash2 size={16} />
          {someAlreadyCancelled ? 'Cancel remaining' : 'Cancel all'}
        </button>
      )}

      <ConfirmModal
        open={cancelAllOpen}
        onClose={() => setCancelAllOpen(false)}
        onConfirm={handleCancelAll}
        title={someAlreadyCancelled ? 'Cancel remaining bookings?' : 'Cancel all bookings?'}
        body={payment.status === 'paid'
          ? 'The remaining amount will be refunded to the client.'
          : 'This will free up the slot(s). You can rebook later if needed.'}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep"
        confirmTone="danger"
        loading={actionLoading === 'cancel'}
      />

      <ConfirmModal
        open={!!cancelBookingTarget}
        onClose={() => setCancelBookingTarget(null)}
        onConfirm={handleCancelOne}
        title="Cancel this booking?"
        body={payment.status === 'paid'
          ? 'A partial refund will be issued for this booking.'
          : bookings.length > 1
            ? 'This booking will be removed; the payment total will reduce to the remaining bookings.'
            : 'This will free up the slot. You can rebook later if needed.'}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep"
        confirmTone="danger"
        loading={actionLoading === 'cancel'}
      />
    </>
  )
}
