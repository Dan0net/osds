import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import BookingsCalendar from '../../components/BookingsCalendar'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function AccountBookings() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const [tab, setTab] = useState(isWalker ? 'incoming' : 'mine')
  const [incoming, setIncoming] = useState([])
  const [mine, setMine] = useState([])
  const [managingId, setManagingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    if (user) loadBookings()
  }, [user?.id, walkerProfile?.id])

  useEffect(() => {
    const requestedIds = incoming.filter((b) => b.status === 'requested').map((b) => b.id)
    setSelectedIds(new Set(requestedIds))
  }, [incoming])

  async function loadBookings() {
    setLoading(true)

    // Load my bookings as a client
    const { data: clientBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        services(*),
        pets(*),
        walker_profiles(slug, business_name)
      `)
      .eq('client_id', user.id)
      .order('booking_date', { ascending: false })

    setMine((clientBookings || []).map(formatBooking))

    // Load incoming bookings as walker
    if (walkerProfile) {
      const { data: walkerBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          pets(*),
          users!bookings_client_id_fkey(name)
        `)
        .eq('walker_id', walkerProfile.id)
        .order('booking_date', { ascending: false })

      setIncoming((walkerBookings || []).map(formatBooking))
    }

    setLoading(false)
  }

  function formatBooking(b) {
    const service = b.services
    const pet = b.pets
    const isOvernight = !!b.end_date && b.end_date !== b.booking_date
    let nights = 0
    if (isOvernight) {
      nights = Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24))
    }
    return {
      ...b,
      service_name: service?.name || 'Unknown service',
      pet_name: pet?.name || '—',
      client_name: b.users?.name || '',
      walker_name: b.walker_profiles?.business_name || '',
      walker_slug: b.walker_profiles?.slug || '',
      price_cents: service ? (isOvernight ? service.price_cents * nights : service.price_cents) : 0,
      is_overnight: isOvernight,
      nights,
      start_time: b.start_time?.slice(0, 5),
      end_time: b.end_time?.slice(0, 5),
    }
  }

  function groupByPayment(bookings) {
    const groups = new Map()
    const singles = []
    for (const b of bookings) {
      if (b.payment_id) {
        if (!groups.has(b.payment_id)) groups.set(b.payment_id, [])
        groups.get(b.payment_id).push(b)
      } else {
        singles.push([b])
      }
    }
    return [...groups.values(), ...singles]
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllInGroup(group) {
    const requestedIds = group.filter((b) => b.status === 'requested').map((b) => b.id)
    const allSelected = requestedIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of requestedIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function handleApproveSelected(ids) {
    const key = ids.join(',')
    setActionLoading(key)
    for (const id of ids) {
      await apiFetch('approve-booking', {
        method: 'POST',
        body: JSON.stringify({ booking_id: id }),
      })
    }
    setActionLoading(null)
    setSelectedIds(new Set())
    await loadBookings()
  }

  async function handleDeclineSelected(ids) {
    const key = ids.join(',')
    setActionLoading(key)
    for (const id of ids) {
      await apiFetch('decline-booking', {
        method: 'POST',
        body: JSON.stringify({ booking_id: id }),
      })
    }
    setActionLoading(null)
    setSelectedIds(new Set())
    await loadBookings()
  }

  async function toggleReopenedSlot(bookingId, date, time) {
    const booking = incoming.find((b) => b.id === bookingId)
    if (!booking) return
    const slots = booking.reopened_slots || []
    const idx = slots.findIndex((s) => s.date === date && s.time === time)
    const newSlots = idx >= 0
      ? slots.filter((_, i) => i !== idx)
      : [...slots, { date, time }]

    await supabase
      .from('bookings')
      .update({ reopened_slots: newSlots })
      .eq('id', bookingId)

    setIncoming((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, reopened_slots: newSlots } : b)),
    )
  }

  function getOvernightBlockedSlots(booking) {
    const result = []
    const current = new Date(booking.booking_date)
    const end = new Date(booking.end_date)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      // Generate 30-min slots from 7am to 7pm
      for (let m = 7 * 60; m < 19 * 60; m += 30) {
        const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        const [h, min] = time.split(':').map(Number)
        const slotMin = h * 60 + min
        let blocked = false
        if (dateStr === booking.booking_date) {
          const [sh, sm] = (booking.start_time || '00:00').split(':').map(Number)
          blocked = slotMin >= sh * 60 + sm
        } else if (dateStr === booking.end_date) {
          const [eh, em] = (booking.end_time || '23:59').split(':').map(Number)
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

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Bookings</h1>
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      <BookingsCalendar incoming={incoming} mine={mine} external={[]} />

      {/* Tabs */}
      {isWalker && (
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
          {incoming.length === 0 && (
            <p className="text-gray-400 text-center py-8">No incoming bookings yet.</p>
          )}
          {groupByPayment(incoming).map((group) => {
            const paymentId = group[0].payment_id
            const key = paymentId || group[0].id
            const requestedInGroup = group.filter((b) => b.status === 'requested')
            const hasRequested = requestedInGroup.length > 0
            const groupStatus = hasRequested ? 'requested' : group[0].status
            const totalCents = group.reduce((sum, b) => sum + b.price_cents, 0)
            const selectedInGroup = requestedInGroup.filter((b) => selectedIds.has(b.id))
            const allGroupSelected = requestedInGroup.length > 0 && requestedInGroup.every((b) => selectedIds.has(b.id))
            const selectedCents = selectedInGroup.reduce((sum, b) => sum + b.price_cents, 0)

            return (
              <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Group header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {hasRequested && group.length > 1 && (
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        onChange={() => toggleAllInGroup(group)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    <span className="text-gray-600">{group[0].client_name}</span>
                    {group[0].pet_name && group[0].pet_name !== '—' && (
                      <>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500">{group[0].pet_name}</span>
                      </>
                    )}
                    {group.length > 1 && (
                      <span className="text-gray-400 text-xs">({group.length} slots)</span>
                    )}
                  </div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[groupStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {groupStatus}
                  </span>
                </div>

                {/* Individual slots with checkboxes */}
                <div className="space-y-1 text-sm text-gray-500 mb-3">
                  {group.map((b) => (
                    <div key={b.id} className="flex items-start gap-2">
                      {b.status === 'requested' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => toggleSelected(b.id)}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                      {b.status !== 'requested' && group.some((g) => g.status === 'requested') && (
                        <span className="w-4" />
                      )}
                      <div>
                        <span className="font-medium text-gray-700">{b.service_name}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        {b.is_overnight ? (
                          <>
                            {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' '}{b.start_time}{' → '}
                            {new Date(b.end_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' '}{b.end_time}
                            {' · '}{b.nights} night{b.nights > 1 ? 's' : ''}
                            {' · '}£{(b.price_cents / 100).toFixed(2)}
                          </>
                        ) : (
                          <>
                            {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}{b.start_time}–{b.end_time}
                            {' · '}£{(b.price_cents / 100).toFixed(2)}
                          </>
                        )}
                        {b.status !== 'requested' && (
                          <span className={`ml-2 inline-block text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                            {b.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {group.length > 1 && (
                    <div className="text-xs font-medium text-gray-700 pt-1">
                      Total: £{(totalCents / 100).toFixed(2)}
                      {selectedInGroup.length > 0 && selectedInGroup.length < requestedInGroup.length && (
                        <span className="text-gray-500 ml-2">
                          (selected: £{(selectedCents / 100).toFixed(2)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {hasRequested && selectedInGroup.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleApproveSelected(selectedInGroup.map((b) => b.id))}
                      disabled={!!actionLoading}
                      className="bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? '...' : selectedInGroup.length === requestedInGroup.length && group.length > 1
                        ? `Approve all (${selectedInGroup.length})`
                        : selectedInGroup.length > 1
                        ? `Approve ${selectedInGroup.length} selected`
                        : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDeclineSelected(selectedInGroup.map((b) => b.id))}
                      disabled={!!actionLoading}
                      className="bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? '...' : selectedInGroup.length === requestedInGroup.length && group.length > 1
                        ? `Decline all (${selectedInGroup.length})`
                        : selectedInGroup.length > 1
                        ? `Decline ${selectedInGroup.length} selected`
                        : 'Decline'}
                    </button>
                  </div>
                )}

                {/* Overnight slot management for each overnight booking in the group */}
                {group.filter((b) => b.is_overnight && (b.status === 'confirmed' || b.status === 'requested' || b.status === 'approved')).map((b) => {
                  const isManaging = managingId === b.id
                  return (
                    <div key={`overnight-${b.id}`} className="mt-2">
                      <button
                        onClick={() => setManagingId(isManaging ? null : b.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {isManaging ? 'Hide Availability ▲' : 'Manage Availability ▼'}
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
                  )
                })}
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
                  {b.price_cents > 0 && <>{' · '}£{(b.price_cents / 100).toFixed(2)}</>}
                </div>
              </div>
            ))}
            {mine.length === 0 && (
              <p className="text-gray-400 text-center py-8">No bookings yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
