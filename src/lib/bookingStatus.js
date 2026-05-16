// Single source of truth for status labels + colors used on booking and
// payment badges. Two helpers because the underlying lifecycles are different:
//   - bookings.status  — booking lifecycle (Requested → Awaiting payment → Paid → Cancelled)
//   - payments.status  — payment row state (pending_approval → awaiting_payment → paid / refunded)
//
// Both take payments.source into account so cash bookings read "Cash on arrival"
// instead of the misleading "Paid".

const TONE_CLASSES = {
  yellow: 'bg-yellow-100 text-yellow-700',
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
      return { label: 'Requested', tone: 'yellow' }
    case 'approved':
    case 'pending':
      return { label: 'Awaiting payment', tone: 'orange' }
    case 'confirmed':
      return source === 'cash'
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Paid', tone: 'green' }
    case 'declined':
      return { label: 'Declined', tone: 'red' }
    case 'cancelled':
    case 'refunded':
      return { label: 'Cancelled', tone: 'gray' }
    case 'hold':
      return { label: 'On hold', tone: 'purple' }
    default:
      return { label: status || '', tone: 'gray' }
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
      return { label: 'Awaiting payment', tone: 'orange' }
    case 'paid':
      return source === 'cash'
        ? { label: 'Cash on arrival', tone: 'indigo' }
        : { label: 'Paid', tone: 'green' }
    case 'refunded':
      return { label: 'Refunded', tone: 'gray' }
    case 'partially_refunded':
      return { label: 'Partially refunded', tone: 'orange' }
    default:
      return { label: status || '', tone: 'gray' }
  }
}
