import { useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { User, PawPrint, Scissors, CreditCard, Trash2, Map, MessageCircle, ChevronLeft, Calendar } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { bookingStatusBadge } from '@/utils/bookingStatus'
import { displayServicePrice, displayPaymentAmount } from '@/utils/pricing'
import { useBooking, useBookingSiblings, useApproveBooking, useDeclineBooking, useCancelBooking } from '@/queries/bookings'
import { usePayNowCheckout } from '@/queries/payments'
import { useEnsureConversation } from '@/queries/messages'
import DetailHeader from '@/shared/detail/DetailHeader'
import DetailHero from '@/shared/detail/DetailHero'
import LinkRow from '@/shared/detail/LinkRow'
import ConfirmModal from '@/shared/modal/ConfirmModal'
import { PageSpinner } from '@/shared/Spinner'
import Button from '@/shared/form/Button'
import { formatGBP, formatShortDate } from '@/utils/formatting'

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
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: booking, isLoading } = useBooking(bookingId)
  const { data: siblings = [] } = useBookingSiblings(booking?.payment_id)
  const approve = useApproveBooking()
  const decline = useDeclineBooking()
  const cancel = useCancelBooking()
  const payNow = usePayNowCheckout()
  const ensureConversation = useEnsureConversation()

  const actionLoading = approve.isPending ? 'approve'
    : decline.isPending ? 'decline'
    : cancel.isPending ? 'cancel'
    : payNow.isPending ? 'pay' : null

  const isWalker = walkerProfile && booking?.walker_profiles?.user_id === user?.id
  const isClient = booking?.client_id === user?.id

  async function handlePayNow() {
    if (!booking?.payments?.id) return
    const res = await payNow.mutateAsync(booking.payments.id)
    if (res?.data?.url) window.location.href = res.data.url
  }

  async function handleCancel() {
    await cancel.mutateAsync({ booking_id: booking.id })
    setCancelOpen(false)
  }

  function handleApprove() { approve.mutate({ booking_id: booking.id }) }
  function handleDecline() { decline.mutate({ booking_id: booking.id }) }

  if (isLoading) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <PageSpinner />
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

  const badge = bookingStatusBadge(booking)
  const heroPrimary = isOvernight
    ? `${formatShortDate(booking.booking_date)} → ${formatShortDate(booking.end_date)}`
    : `${formatShortDate(booking.booking_date)} · ${booking.start_time?.slice(0, 5)}${booking.end_time ? `–${booking.end_time.slice(0, 5)}` : ''}`
  const servicePriceCents = displayServicePrice(booking.services, isWalker)
  const paymentAmountCents = booking.payments ? displayPaymentAmount(booking.payments, isWalker) : null

  const activeSiblings = siblings.filter((s) =>
    s.id !== booking.id && !['cancelled', 'declined', 'refunded'].includes(s.status),
  )
  const isOrphan = ['cancelled', 'refunded'].includes(booking.status)
    && booking.payments?.status === 'awaiting_payment'
    && activeSiblings.length > 0

  const isMulti = siblings.length > 1
  const showApproveDecline = canApprove && !isMulti
  const showPayNow = canPay && !isMulti
  const showReviewAll = (canApprove || canPay) && isMulti

  const approveButtons = showApproveDecline ? (
    <div className="flex items-center gap-3">
      <Button onClick={handleApprove} disabled={!!actionLoading} variant="approve">
        {actionLoading === 'approve' ? 'Approving…' : 'Approve'}
      </Button>
      <Button onClick={handleDecline} disabled={!!actionLoading} variant="decline">
        {actionLoading === 'decline' ? 'Declining…' : 'Decline'}
      </Button>
    </div>
  ) : null
  const payNowButton = showPayNow ? (
    <Button onClick={handlePayNow} disabled={actionLoading === 'pay'}>
      {actionLoading === 'pay' ? 'Redirecting…' : 'Pay now'}
    </Button>
  ) : null
  const reviewAllButton = showReviewAll ? (
    <Link
      to={`/account/money/${booking.payment_id}`}
      className="inline-flex items-center bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50"
    >
      Review all bookings ({siblings.length}) →
    </Link>
  ) : null
  const heroAction = approveButtons || payNowButton || reviewAllButton

  const heroExtra = (isMulti && !heroAction) ? (
    <Link
      to={`/account/money/${booking.payment_id}`}
      className="inline-flex items-center gap-1 text-xs font-medium underline opacity-80 hover:opacity-100"
    >
      1 of {siblings.length} bookings on payment →
    </Link>
  ) : null

  async function openConversation() {
    const id = await ensureConversation.mutateAsync({
      walkerId: booking.walker_id, clientId: booking.client_id,
    })
    if (id) navigate(`/account/messages/${id}`)
  }

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
        extra={heroExtra}
        action={heroAction}
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
            onClick={openConversation}
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
                  {formatGBP(servicePriceCents)}
                </span>
              )
            }
          />
        )}
        {booking.payments && (
          <LinkRow
            icon={CreditCard}
            label="Payment"
            value={paymentAmountCents != null ? formatGBP(paymentAmountCents) : ''}
            secondary={
              isOrphan
                ? 'This booking is cancelled — payment now covers remaining bookings only'
                : (booking.payments.source === 'cash' ? 'Cash on arrival' : 'Online')
            }
            to={`/account/money/${booking.payments.id}`}
            state={{ from: `/account/bookings/${booking.id}` }}
          />
        )}
      </div>

      {cancellable && (
        <Button onClick={() => setCancelOpen(true)} variant="cancel" className="mt-4">
          <Trash2 size={16} />
          Cancel booking
        </Button>
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
