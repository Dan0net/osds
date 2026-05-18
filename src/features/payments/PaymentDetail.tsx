import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { User, PawPrint, CreditCard, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { paymentStatusBadge, bookingStatusBadge, toneColor } from '@/utils/bookingStatus'
import { displayPaymentAmount, displayServicePrice } from '@/utils/pricing'
import Badge from '@/shared/Badge'
import Button from '@/shared/form/Button'
import { formatGBP, formatLongDate, formatDayMonth } from '@/utils/formatting'
import {
  usePayment, usePaymentBookings, usePaymentRefunds,
  usePayNowCheckout, useMarkPaymentRead, useUnreadPaymentIds,
} from '@/queries/payments'
import { useApproveBooking, useDeclineBooking, useCancelBooking } from '@/queries/bookings'
import DetailHeader from '@/shared/detail/DetailHeader'
import DetailHero from '@/shared/detail/DetailHero'
import LinkRow from '@/shared/detail/LinkRow'
import BookingCard from '@/features/bookings/BookingCard'
import ConfirmModal from '@/shared/modal/ConfirmModal'
import CelebrationModal from '@/shared/modal/CelebrationModal'
import { PageSpinner } from '@/shared/Spinner'

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

  const [cancelAllOpen, setCancelAllOpen] = useState(false)
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null)
  const [paySuccessOpen, setPaySuccessOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const paymentQuery = usePayment(paymentId)
  const bookingsQuery = usePaymentBookings(paymentId)
  const refundsQuery = usePaymentRefunds(paymentId)
  const payNow = usePayNowCheckout()
  const approveAll = useApproveBooking()
  const declineAll = useDeclineBooking()
  const cancelMutation = useCancelBooking()
  const markRead = useMarkPaymentRead(user?.id)
  const unreadQuery = useUnreadPaymentIds(user?.id)
  const isUnread = Array.isArray(unreadQuery.data) && unreadQuery.data.includes(paymentId)

  const payment = paymentQuery.data
  const bookings = bookingsQuery.data || []
  const refunds = refundsQuery.data || []
  const loading = paymentQuery.isLoading || bookingsQuery.isLoading

  const actionLoading = payNow.isPending ? 'pay'
    : approveAll.isPending ? 'approve'
    : declineAll.isPending ? 'decline'
    : cancelMutation.isPending ? 'cancel' : null

  useEffect(() => {
    if (!user?.id || !paymentId || !isUnread) return
    markRead.mutate(paymentId)
  }, [user?.id, paymentId, isUnread])

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return
    setPaySuccessOpen(true)
    searchParams.delete('payment')
    searchParams.delete('session_id')
    setSearchParams(searchParams, { replace: true })
  }, [])

  const isWalker = walkerProfile && payment?.walker_profiles?.user_id === user?.id
  const isClient = payment?.client_id === user?.id

  async function handlePayNow() {
    const res = await payNow.mutateAsync(paymentId)
    if (res?.data?.url) window.location.href = res.data.url
  }

  function handleApproveAll() { approveAll.mutate({ payment_id: paymentId }) }
  function handleDeclineAll() { declineAll.mutate({ payment_id: paymentId }) }

  async function handleCancelAll() {
    await cancelMutation.mutateAsync({ payment_id: paymentId })
    setCancelAllOpen(false)
  }

  async function handleCancelOne() {
    if (!cancelBookingTarget) return
    await cancelMutation.mutateAsync({ booking_id: cancelBookingTarget.id })
    setCancelBookingTarget(null)
  }

  const refundsByBooking = useMemo(() => {
    const map = new Map()
    const unattributed = []
    for (const r of refunds) {
      if (r.status !== 'succeeded' && r.status !== 'pending') continue
      const ids = Array.isArray(r.booking_ids) ? r.booking_ids : []
      if (ids.length === 0) { unattributed.push(r); continue }
      const perBooking = Math.round(r.amount_cents / ids.length)
      for (const bid of ids) {
        if (!map.has(bid)) map.set(bid, [])
        map.get(bid).push({ ...r, amount_cents: perBooking })
      }
    }
    return { perBooking: map, unattributed }
  }, [refunds])

  if (loading) return <PageSpinner />
  if (!payment) return <p className="text-center py-16 text-gray-500">Payment not found.</p>

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
  const requestedDate = formatLongDate(payment.created_at)

  const payNowButton = canPay ? (
    <Button onClick={handlePayNow} disabled={actionLoading === 'pay'}>
      {actionLoading === 'pay' ? 'Redirecting…' : 'Pay now'}
    </Button>
  ) : null

  const approveButtons = canApproveAll ? (
    <div className="flex items-center gap-3">
      <Button onClick={handleApproveAll} disabled={!!actionLoading} variant="approve">
        {actionLoading === 'approve' ? 'Approving…' : 'Approve all'}
      </Button>
      <Button onClick={handleDeclineAll} disabled={!!actionLoading} variant="decline">
        {actionLoading === 'decline' ? 'Declining…' : 'Decline all'}
      </Button>
    </div>
  ) : null

  const heroAction = payNowButton || approveButtons

  return (
    <>
      <DetailHeader backHref={backHref} backLabel={backLabel} />

      <DetailHero
        icon={CreditCard}
        tone={badge.tone}
        primary={formatGBP(displayAmount)}
        status={badge.label}
        secondary={`${isWalker ? 'From' : 'To'} ${counterpartyName} · Requested ${requestedDate}`}
        extra={
          (payment.refunded_amount_cents || 0) > 0 && (
            <p className="text-sm">
              Refunded {formatGBP(displayRefunded)} of {formatGBP(displayTotal)}
            </p>
          )
        }
        action={heroAction}
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
                  statusBadge={<Badge tone={bookingBadge.tone} size="sm">{bookingBadge.label}</Badge>}
                  right={
                    priceCents != null && priceCents !== 0 && (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatGBP(priceCents)}
                      </span>
                    )
                  }
                  onCancel={cancellable ? () => setCancelBookingTarget(b) : undefined}
                >
                  {bRefunds.length > 0 && (
                    <div className="mt-2 pl-[3.5rem] space-y-0.5">
                      {bRefunds.map((r) => (
                        <p key={r.id} className="text-xs text-gray-500">
                          Refunded {formatGBP(r.amount_cents)} on {formatDayMonth(r.created_at)}
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
                      {formatGBP(r.amount_cents)} on {formatDayMonth(r.created_at)}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(() => {
        if (!anyCancellable) return null
        const isPaid = payment.status === 'paid'
        const action = isPaid ? 'Refund' : anyRequested ? 'Decline' : 'Cancel'
        const label = `${action} ${someAlreadyCancelled ? 'remaining' : 'all'}`
        return (
          <>
            <Button onClick={() => setCancelAllOpen(true)} disabled={!!actionLoading} variant="cancel" className="mt-4 self-start w-fit">
              <Trash2 size={16} />
              {label}
            </Button>

            <ConfirmModal
              open={cancelAllOpen}
              onClose={() => setCancelAllOpen(false)}
              onConfirm={handleCancelAll}
              title={`${label}?`}
              body={isPaid
                ? 'The remaining amount will be refunded to the client.'
                : 'This will free up the slot(s). You can rebook later if needed.'}
              confirmLabel={`Yes, ${action.toLowerCase()}`}
              cancelLabel="Keep"
              confirmTone="danger"
              loading={actionLoading === 'cancel'}
            />
          </>
        )
      })()}

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

      <CelebrationModal
        open={paySuccessOpen}
        onClose={() => setPaySuccessOpen(false)}
        lottieUrl="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/lottie.json"
        title="Payment successful!"
        footnote="Your booking is now confirmed."
      />

      <div aria-hidden className="h-8 shrink-0" />
    </>
  )
}
