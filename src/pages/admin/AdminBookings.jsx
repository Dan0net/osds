import { useState } from 'react'
import { MOCK_BOOKINGS, getMockSlots } from '../../lib/mockData'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState(MOCK_BOOKINGS)
  const [managingId, setManagingId] = useState(null)

  function updateStatus(id, status) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    )
  }

  function toggleReopenedSlot(bookingId, date, time) {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b
        const slots = b.reopened_slots || []
        const idx = slots.findIndex((s) => s.date === date && s.time === time)
        if (idx >= 0) {
          return { ...b, reopened_slots: slots.filter((_, i) => i !== idx) }
        }
        return { ...b, reopened_slots: [...slots, { date, time }] }
      }),
    )
  }

  // Get all time slots that are blocked by an overnight booking
  function getOvernightBlockedSlots(booking) {
    const result = []
    const current = new Date(booking.booking_date)
    const end = new Date(booking.end_date)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const daySlots = getMockSlots(dateStr, 30)

      for (const time of daySlots) {
        const [h, m] = time.split(':').map(Number)
        const slotMin = h * 60 + m
        let blocked = false

        if (dateStr === booking.booking_date) {
          const [sh, sm] = booking.start_time.split(':').map(Number)
          blocked = slotMin >= sh * 60 + sm
        } else if (dateStr === booking.end_date) {
          const [eh, em] = booking.end_time.split(':').map(Number)
          blocked = slotMin < eh * 60 + em
        } else {
          blocked = true
        }

        if (blocked) result.push({ date: dateStr, time })
      }

      current.setDate(current.getDate() + 1)
    }
    return result
  }

  function isSlotReopened(booking, date, time) {
    return (booking.reopened_slots || []).some(
      (s) => s.date === date && s.time === time,
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const isOvernight = booking.is_overnight
          const isManaging = managingId === booking.id

          return (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-semibold">{booking.service_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{booking.client_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">{booking.pet_name}</span>
                </div>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                    STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="text-sm text-gray-500 mb-3">
                {isOvernight ? (
                  <>
                    {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}{' '}
                    {booking.start_time}
                    {' → '}
                    {new Date(booking.end_date).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}{' '}
                    {booking.end_time}
                    {' · '}{booking.nights} night{booking.nights > 1 ? 's' : ''}
                    {' · '}£{(booking.price_cents / 100).toFixed(2)}
                  </>
                ) : (
                  <>
                    {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}{' '}
                    · {booking.start_time}–{booking.end_time} ·{' '}
                    £{(booking.price_cents / 100).toFixed(2)}
                  </>
                )}
              </div>

              {booking.status === 'requested' && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => updateStatus(booking.id, 'confirmed')}
                    className="bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, 'declined')}
                    className="bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Overnight slot management */}
              {isOvernight && (booking.status === 'confirmed' || booking.status === 'requested') && (
                <div>
                  <button
                    onClick={() => setManagingId(isManaging ? null : booking.id)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {isManaging ? 'Hide Availability ▲' : 'Manage Availability ▼'}
                  </button>

                  {isManaging && (() => {
                    const blockedSlots = getOvernightBlockedSlots(booking)
                    // Group by date
                    const byDate = {}
                    for (const s of blockedSlots) {
                      if (!byDate[s.date]) byDate[s.date] = []
                      byDate[s.date].push(s.time)
                    }
                    const dates = Object.keys(byDate).sort()
                    const reopenedCount = (booking.reopened_slots || []).length

                    return (
                      <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-3">
                          Toggle slots to re-open for services under 3 hours.
                          All slots are blocked by default.
                          {reopenedCount > 0 && (
                            <span className="ml-1 font-medium text-green-700">
                              {reopenedCount} slot{reopenedCount > 1 ? 's' : ''} reopened
                            </span>
                          )}
                        </p>

                        <div className="space-y-3">
                          {dates.map((date) => (
                            <div key={date}>
                              <p className="text-xs font-medium text-gray-600 mb-1">
                                {new Date(date).toLocaleDateString('en-GB', {
                                  weekday: 'short', day: 'numeric', month: 'short',
                                })}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {byDate[date].map((time) => {
                                  const reopened = isSlotReopened(booking, date, time)
                                  return (
                                    <button
                                      key={`${date}-${time}`}
                                      onClick={() => toggleReopenedSlot(booking.id, date, time)}
                                      className={`px-2 py-1 text-xs rounded transition ${
                                        reopened
                                          ? 'bg-green-100 text-green-700 border border-green-300 font-medium'
                                          : 'bg-gray-200 text-gray-500 border border-gray-300 hover:bg-gray-300'
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
