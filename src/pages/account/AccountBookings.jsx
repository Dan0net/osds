import { useState } from 'react'
import { MOCK_USER, MOCK_BOOKINGS, MOCK_CLIENT_BOOKINGS, MOCK_WALKERS, getMockSlots } from '../../lib/mockData'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function AccountBookings() {
  const [tab, setTab] = useState(MOCK_USER.has_walker_profile ? 'incoming' : 'mine')
  const [incoming, setIncoming] = useState(MOCK_BOOKINGS)
  const [mine] = useState(MOCK_CLIENT_BOOKINGS)
  const [managingId, setManagingId] = useState(null)
  const [favourites] = useState(
    MOCK_WALKERS.filter((w) => MOCK_USER.favourite_walkers.includes(w.id)),
  )

  function updateStatus(id, status) {
    setIncoming((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }

  function toggleReopenedSlot(bookingId, date, time) {
    setIncoming((prev) =>
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      {/* Tabs */}
      {MOCK_USER.has_walker_profile && (
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab('incoming')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              tab === 'incoming' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Incoming requests
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            My bookings
          </button>
        </div>
      )}

      {/* Incoming requests (walker view) */}
      {tab === 'incoming' && (
        <div className="space-y-3">
          {incoming.map((b) => {
            const isOvernight = b.is_overnight
            const isManaging = managingId === b.id

            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{b.service_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{b.client_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500">{b.pet_name}</span>
                  </div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  {isOvernight ? (
                    <>
                      {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' '}{b.start_time}{' → '}
                      {new Date(b.end_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' '}{b.end_time}
                      {' · '}{b.nights} night{b.nights > 1 ? 's' : ''}
                      {' · '}£{(b.price_cents / 100).toFixed(2)}
                    </>
                  ) : (
                    <>
                      {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{b.start_time}–{b.end_time}
                      {' · '}£{(b.price_cents / 100).toFixed(2)}
                    </>
                  )}
                </div>

                {b.status === 'requested' && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updateStatus(b.id, 'confirmed')}
                      className="bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(b.id, 'declined')}
                      className="bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {/* Overnight slot management */}
                {isOvernight && (b.status === 'confirmed' || b.status === 'requested') && (
                  <div>
                    <button
                      onClick={() => setManagingId(isManaging ? null : b.id)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {isManaging ? 'Hide Availability \u25B2' : 'Manage Availability \u25BC'}
                    </button>

                    {isManaging && (() => {
                      const blockedSlots = getOvernightBlockedSlots(b)
                      const byDate = {}
                      for (const s of blockedSlots) {
                        if (!byDate[s.date]) byDate[s.date] = []
                        byDate[s.date].push(s.time)
                      }
                      const dates = Object.keys(byDate).sort()
                      const reopenedCount = (b.reopened_slots || []).length

                      return (
                        <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="text-xs text-gray-500 mb-3">
                            Toggle slots to re-open for services under 3 hours. All slots are blocked by default.
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
                                  {new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {byDate[date].map((time) => {
                                    const reopened = (b.reopened_slots || []).some((s) => s.date === date && s.time === time)
                                    return (
                                      <button
                                        key={`${date}-${time}`}
                                        onClick={() => toggleReopenedSlot(b.id, date, time)}
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
      )}

      {/* My bookings (client view) */}
      {tab === 'mine' && (
        <>
          <div className="space-y-3 mb-10">
            {mine.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{b.service_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{b.walker_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500">{b.pet_name}</span>
                  </div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}{b.start_time}–{b.end_time}
                  {' · '}£{(b.price_cents / 100).toFixed(2)}
                </div>
                {(b.status === 'requested' || b.status === 'confirmed') && (
                  <button className="mt-2 text-sm text-red-500 hover:text-red-600">Cancel</button>
                )}
              </div>
            ))}
            {mine.length === 0 && (
              <p className="text-gray-400 text-center py-8">No bookings yet.</p>
            )}
          </div>

          {/* Favourites */}
          {favourites.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-4">Favourite Walkers</h2>
              <div className="space-y-2">
                {favourites.map((w) => (
                  <div key={w.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {w.business_name.charAt(0)}
                      </div>
                      <span className="font-semibold">{w.business_name}</span>
                    </div>
                    <a href={`/w/${w.slug}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                      View page
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
