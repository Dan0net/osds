// Single source of truth for status labels + colors used on booking and
// payment badges. Two helpers because the underlying lifecycles are different:
//   - bookings.status  — booking lifecycle (Requested → Awaiting payment → Paid → Cancelled)
//   - payments.status  — payment row state (pending_approval → awaiting_payment → paid / refunded)
//
// Both take payments.source into account so cash bookings read "Cash on arrival"
// instead of the misleading "Paid".

const TONE_CLASSES = {
  yellow: 'bg-yellow-100 text-yellow-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-100 text-gray-600',
}

// Solid hex values matching Tailwind's `*-500` shade — vibrant enough to
// stand out on the coloured bar on event rows and calendar dots.
const TONE_COLORS = {
  yellow: '#eab308',
  amber: '#f59e0b',
  blue: '#3b82f6',
  green: '#22c55e',
  indigo: '#6366f1',
  red: '#ef4444',
  purple: '#a855f7',
  orange: '#f97316',
  gray: '#9ca3af',
}

export function toneClass(tone) {
  return TONE_CLASSES[tone] || TONE_CLASSES.gray
}

export function toneColor(tone) {
  return TONE_COLORS[tone] || TONE_COLORS.gray
}

export function bookingStatusBadge(booking) {
  if (!booking) return { label: '', tone: 'gray' }
  const status = booking.status
  const source = booking.payments?.source
  switch (status) {
    case 'requested':
      return { label: 'Requested', tone: 'amber' }
    case 'approved':
    case 'pending':
      return { label: 'Awaiting payment', tone: 'blue' }
    case 'confirmed':
      return source === 'cash'
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Paid', tone: 'green' }
    case 'declined':
      return { label: 'Declined', tone: 'red' }
    case 'cancelled':
      return { label: 'Cancelled', tone: 'gray' }
    case 'refunded':
      return { label: 'Refunded', tone: 'red' }
    case 'hold':
      return { label: 'On hold', tone: 'purple' }
    default:
      return { label: status || '', tone: 'gray' }
  }
}

// Frozen-in-time badge for system message lifecycle events. Drives the
// pill + bar colour on conversation system messages. Reading the live
// payments.status would mutate old messages as the payment progresses.
export function eventStatusBadge(eventType, paymentSource) {
  const isCash = paymentSource === 'cash'
  switch (eventType) {
    case 'booking_request':
      return { label: 'Pending approval', tone: 'yellow' }
    case 'booking_approved':
    case 'booking_payment_link':
      return isCash
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Awaiting payment', tone: 'blue' }
    case 'payment_confirmed':
      return { label: 'Paid', tone: 'green' }
    case 'booking_confirmed':
      return isCash
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Paid', tone: 'green' }
    case 'booking_declined':
      return { label: 'Declined', tone: 'red' }
    case 'booking_cancelled':
      return { label: 'Cancelled', tone: 'red' }
    case 'booking_rescheduled':
      return { label: 'Rescheduled', tone: 'orange' }
    default:
      return null
  }
}

export function paymentStatusBadge(payment) {
  if (!payment) return { label: '', tone: 'gray' }
  const status = payment.status
  const source = payment.source
  switch (status) {
    case 'pending_approval':
      return { label: 'Awaiting approval', tone: 'yellow' }
    case 'awaiting_payment':
      return { label: 'Awaiting payment', tone: 'blue' }
    case 'paid':
      return source === 'cash'
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Paid', tone: 'green' }
    case 'refunded':
      return { label: 'Refunded', tone: 'red' }
    case 'partially_refunded':
      return { label: 'Partially refunded', tone: 'orange' }
    case 'cancelled':
      return { label: 'Cancelled', tone: 'gray' }
    default:
      return { label: status || '', tone: 'gray' }
  }
}
