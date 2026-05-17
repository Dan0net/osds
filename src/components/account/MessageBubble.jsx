import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { eventStatusBadge, toneClass, toneColor } from '../../lib/bookingStatus'
import { createCheckout } from '../../lib/api'

export default function MessageBubble({ message, isSelf, paymentMap, isOwner }) {
  if (message.kind === 'system') return <SystemMessage message={message} paymentMap={paymentMap} isOwner={isOwner} />

  const time = message.created_at ? format(parseISO(message.created_at), 'HH:mm') : ''
  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
          isSelf
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        {message.body}
      </div>
      <span className="text-[11px] text-gray-400 mt-0.5 px-1">{time}</span>
    </div>
  )
}

function formatPrice(cents) {
  if (cents == null) return ''
  const pounds = cents / 100
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`
}

function SystemMessage({ message, paymentMap, isOwner }) {
  const paymentId = message.link?.match(/^\/account\/payments\/([^/?#]+)/)?.[1] || null
  const paymentData = paymentId ? paymentMap?.get(paymentId) : null
  const badge = eventStatusBadge(message.event_type, paymentData?.source)

  if (!badge || !paymentId) return <SystemPill message={message} />

  const descriptor = paymentData
    ? (paymentData.bookingCount === 1
      ? (paymentData.firstServiceName || 'Booking')
      : `${paymentData.bookingCount} bookings`)
    : null
  const price = paymentData ? formatPrice(paymentData.totalCents) : null
  const isPaymentRequest = message.event_type === 'booking_approved' || message.event_type === 'booking_payment_link'

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-md bg-white border border-gray-200 rounded-lg overflow-hidden">
        <span className="w-1 self-stretch shrink-0" style={{ backgroundColor: toneColor(badge.tone) }} />
        <div className="flex-1 p-3 space-y-2">
          <p className="text-sm text-gray-700">{message.body}</p>
          <Link
            to={`/account/payments/${paymentId}`}
            className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition"
          >
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${toneClass(badge.tone)}`}>
              {badge.label}
            </span>
            <span className="flex-1 truncate">
              {descriptor ? `${descriptor}${price ? ` · ${price}` : ''}` : 'View payment'}
            </span>
            <ChevronRight size={16} className="text-gray-400 shrink-0" />
          </Link>
          {isOwner && isPaymentRequest && <PayNowButton paymentId={paymentId} />}
        </div>
      </div>
    </div>
  )
}

function PayNowButton({ paymentId }) {
  const [loading, setLoading] = useState(false)
  async function pay() {
    if (loading) return
    setLoading(true)
    const res = await createCheckout(paymentId)
    if (res?.data?.url) {
      window.location.href = res.data.url
      return
    }
    setLoading(false)
  }
  return (
    <button
      type="button"
      onClick={pay}
      disabled={loading}
      className="cursor-pointer w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
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
