import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { eventStatusBadge, toneColor } from '@/utils/bookingStatus'
import { usePayNowCheckout } from '@/queries/payments'
import Badge from '@/shared/Badge'
import { formatGBP } from '@/utils/formatting'

export default function MessageBubble({ message, isSelf, paymentMap, latestMessageIdByPayment, isOwner }) {
  if (message.kind === 'system') return <SystemMessage message={message} paymentMap={paymentMap} latestMessageIdByPayment={latestMessageIdByPayment} isOwner={isOwner} />

  const time = message.created_at ? format(parseISO(message.created_at), 'HH:mm') : ''
  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`min-w-[3rem] max-w-[80%] sm:max-w-[70%] pl-3 pr-3 py-2 rounded-2xl text-sm break-words ${
          isSelf
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        <span className="whitespace-pre-wrap">{message.body}</span>
        <span className={`float-right ml-2 align-baseline text-[10px] relative top-2 ${isSelf ? 'text-indigo-200' : 'text-gray-400'}`}>{time}</span>
      </div>
    </div>
  )
}

function SystemMessage({ message, paymentMap, latestMessageIdByPayment, isOwner }) {
  const paymentId = message.link?.match(/^\/account\/(?:payments|money)\/([^/?#]+)/)?.[1] || null
  const paymentData = paymentId ? paymentMap?.get(paymentId) : null
  const badge = eventStatusBadge(message.event_type, paymentData?.source)

  if (!badge || !paymentId) return <SystemPill message={message} />

  const descriptor = paymentData
    ? (paymentData.bookingCount === 1
      ? (paymentData.firstServiceName || 'Booking')
      : `${paymentData.bookingCount} bookings`)
    : null
  const viewerAmount = paymentData
    ? (isOwner
        ? paymentData.totalCents - paymentData.refundedAmountCents
        : (() => {
            const total = paymentData.totalCents || 0
            const fee = paymentData.platformFeeCents || 0
            const refunded = paymentData.refundedAmountCents || 0
            const grossTake = total - fee
            const refundedTake = total > 0 ? Math.round((refunded * grossTake) / total) : 0
            return Math.max(0, grossTake - refundedTake)
          })()
      )
    : null
  const price = viewerAmount != null ? formatGBP(viewerAmount, { smart: true }) : null
  const isPaymentRequest = message.event_type === 'booking_approved' || message.event_type === 'booking_payment_link'
  const isStale = latestMessageIdByPayment?.get(paymentId) !== message.id
  const time = message.created_at ? format(parseISO(message.created_at), 'HH:mm') : ''

  return (
    <div className="flex justify-center">
      <div className={`flex w-full max-w-md bg-white border border-gray-200 rounded-lg overflow-hidden ${isStale ? 'opacity-60' : ''}`}>
        <span className="w-1 self-stretch shrink-0" style={{ backgroundColor: toneColor(badge.tone) }} />
        <div className="flex-1 p-3 space-y-2">
          <p className="text-sm text-gray-700">{message.body}</p>
          <Link
            to={`/account/money/${paymentId}`}
            className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition"
          >
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span className="flex-1 truncate">
              {descriptor ? `${descriptor}${price ? ` · ${price}` : ''}` : 'View payment'}
            </span>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </Link>
          {isOwner && isPaymentRequest && <PayNowButton paymentId={paymentId} disabled={isStale} />}
          <div className="text-right text-[10px] text-gray-400">{time}</div>
        </div>
      </div>
    </div>
  )
}

function PayNowButton({ paymentId, disabled }) {
  const payNow = usePayNowCheckout()
  const loading = payNow.isPending
  async function pay() {
    if (loading || disabled) return
    const res = await payNow.mutateAsync(paymentId)
    if (res?.data?.url) {
      window.location.href = res.data.url
    }
  }
  return (
    <button
      type="button"
      onClick={pay}
      disabled={loading || disabled}
      className="cursor-pointer w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? 'Loading…' : 'Pay now'}
    </button>
  )
}

function SystemPill({ message }) {
  const inner = (
    <>
      <span>{message.body}</span>
      {message.link && <ChevronRight size={14} className="text-gray-400" />}
    </>
  )
  const className = 'inline-flex items-center gap-1 max-w-[90%] bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1.5'
  return (
    <div className="flex justify-center">
      {message.link ? (
        <Link to={message.link} className={`${className} hover:bg-gray-200 transition`}>
          {inner}
        </Link>
      ) : (
        <span className={className}>{inner}</span>
      )}
    </div>
  )
}
