import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_SERVICES, MOCK_BOOKINGS, getMockSlots } from '../lib/mockData'

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  // Start on Monday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date.toISOString().split('T')[0]
  })
}

function formatTime(time) {
  return time
}

export default function AvailabilityCalendar({ services }) {
  const walkerServices = services || MOCK_SERVICES
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedService, setSelectedService] = useState('')
  const [selectedSlots, setSelectedSlots] = useState([]) // [{date, time, service}]
  const [overnightStart, setOvernightStart] = useState(null) // {date, time} — first click for overnight

  const today = new Date()
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const service = walkerServices.find((s) => s.id === selectedService)
  const duration = service?.duration_minutes || 30
  const isOvernight = service?.service_type === 'overnight'

  // Compute slots for each day in the week
  const weekSlots = useMemo(() => {
    const result = {}
    for (const date of weekDates) {
      result[date] = getMockSlots(date, duration, { overnight: isOvernight })
    }
    return result
  }, [weekDates.join(','), duration, isOvernight])

  // Build unified time row list (all unique times across the week)
  const allTimes = useMemo(() => {
    const timeSet = new Set()
    for (const date of weekDates) {
      // When overnight service selected, only show 7am-7pm slots
      const baseSlots = getMockSlots(date, 30, { overnight: isOvernight })
      baseSlots.forEach((t) => timeSet.add(t))
    }
    return Array.from(timeSet).sort()
  }, [weekDates.join(','), isOvernight])

  function isAvailable(date, time) {
    return weekSlots[date]?.includes(time) || false
  }

  function isSelected(date, time) {
    if (overnightStart && overnightStart.date === date && overnightStart.time === time) return true
    return selectedSlots.some((s) => s.date === date && s.time === time)
  }

  // Check if a date falls within an overnight booking range
  function isInOvernightRange(date) {
    return selectedSlots.some((s) => {
      if (!s.isOvernight) return false
      return date > s.date && date <= s.endDate
    })
  }

  // Check if a slot is blocked by a selected booking that spans multiple 30-min slots
  // or by an overnight booking that spans multiple days
  function isBlockedBySelection(date, time) {
    const [h, m] = time.split(':').map(Number)
    const slotMin = h * 60 + m
    return selectedSlots.some((s) => {
      if (s.isOvernight) {
        // Block all slots on days covered by the overnight stay
        if (date > s.date && date < s.endDate) return true
        // On start day, block times after the drop-off slot
        if (date === s.date) {
          const [sh, sm] = s.time.split(':').map(Number)
          if (slotMin > sh * 60 + sm) return true
        }
        // On end day, block times before the pickup slot
        if (date === s.endDate) {
          const [eh, em] = s.endTime.split(':').map(Number)
          if (slotMin < eh * 60 + em) return true
        }
        return false
      }
      // Standard multi-slot blocking
      if (s.date !== date) return false
      const [sh, sm] = s.time.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = startMin + s.durationMinutes
      return slotMin > startMin && slotMin < endMin
    })
  }

  // Check if a slot is blocked by an existing confirmed/requested overnight booking
  // Returns false if the slot has been reopened by admin AND current service < 3 hours
  function isBlockedByExistingBooking(date, time) {
    const [h, m] = time.split(':').map(Number)
    const slotMin = h * 60 + m

    for (const booking of MOCK_BOOKINGS) {
      if (!booking.is_overnight) continue
      if (booking.status !== 'confirmed' && booking.status !== 'requested') continue

      let inRange = false
      if (date > booking.booking_date && date < booking.end_date) {
        inRange = true
      } else if (date === booking.booking_date) {
        const [sh, sm] = booking.start_time.split(':').map(Number)
        inRange = slotMin >= sh * 60 + sm
      } else if (date === booking.end_date) {
        const [eh, em] = booking.end_time.split(':').map(Number)
        inRange = slotMin < eh * 60 + em
      }

      if (!inRange) continue

      // Check if admin reopened this slot
      const reopened = (booking.reopened_slots || []).some(
        (s) => s.date === date && s.time === time,
      )

      // Reopened slots are available only for non-overnight services under 3 hours
      if (reopened && service && service.duration_minutes < 180 && service.service_type !== 'overnight') {
        continue
      }

      return true
    }
    return false
  }

  // Check if this is a valid end slot for an overnight booking in progress
  function isValidOvernightEnd(date, time) {
    if (!overnightStart) return false
    return date > overnightStart.date
  }

  // Get the overnight start indicator for display
  function isOvernightStartSlot(date, time) {
    return overnightStart && overnightStart.date === date && overnightStart.time === time
  }

  function isPast(date) {
    const todayStr = today.toISOString().split('T')[0]
    return date < todayStr
  }

  function toggleSlot(date, time) {
    if (!isAvailable(date, time) || isPast(date)) return

    const svc = service || walkerServices[0]
    const svcIsOvernight = svc.service_type === 'overnight'

    if (svcIsOvernight) {
      // Two-step overnight selection
      if (!overnightStart) {
        // First click: set drop-off date+time
        setOvernightStart({ date, time })
      } else if (overnightStart.date === date && overnightStart.time === time) {
        // Clicking the same slot cancels
        setOvernightStart(null)
      } else if (date > overnightStart.date) {
        // Second click: set pickup date+time — must be a later day
        const startDate = new Date(overnightStart.date)
        const endDate = new Date(date)
        const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))

        setSelectedSlots((prev) => [
          ...prev,
          {
            date: overnightStart.date,
            time: overnightStart.time,
            endDate: date,
            endTime: time,
            serviceId: svc.id,
            serviceName: svc.name,
            priceCents: svc.price_cents * nights,
            durationMinutes: svc.duration_minutes,
            isOvernight: true,
            nights,
          },
        ])
        setOvernightStart(null)
      }
      // Clicks on same day (but different slot) are ignored — end must be a different day
      return
    }

    // Standard service toggle
    const existing = selectedSlots.findIndex(
      (s) => s.date === date && s.time === time,
    )
    if (existing >= 0) {
      setSelectedSlots((prev) => prev.filter((_, i) => i !== existing))
    } else {
      const [h, m] = time.split(':').map(Number)
      const endMin = h * 60 + m + (svc?.duration_minutes || 30)
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

      setSelectedSlots((prev) => [
        ...prev,
        {
          date,
          time,
          endTime,
          endDate: date,
          serviceId: svc.id,
          serviceName: svc.name,
          priceCents: svc.price_cents,
          durationMinutes: svc.duration_minutes,
          isOvernight: false,
          nights: 0,
        },
      ])
    }
  }

  function cancelOvernightSelection() {
    setOvernightStart(null)
  }

  function handleBookNow() {
    navigate(`${prefix}/book`, { state: { slots: selectedSlots } })
  }

  const canGoPrev = weekOffset > 0

  return (
    <div>
      {/* Overnight selection prompt */}
      {isOvernight && overnightStart && (
        <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between">
          <p className="text-xs text-purple-700">
            <span className="font-medium">Drop-off:</span>{' '}
            {new Date(overnightStart.date).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}{' '}
            at {overnightStart.time} — now select <span className="font-medium">pick-up</span>
          </p>
          <button
            onClick={cancelOvernightSelection}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Service filter */}
      <div className="mb-3">
        <select
          value={selectedService}
          onChange={(e) => {
            setSelectedService(e.target.value)
            setSelectedSlots([])
            setOvernightStart(null)
          }}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-full sm:w-auto focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="">All services (30 min slots)</option>
          {walkerServices.filter((s) => s.active).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.service_type === 'overnight' ? 'per night' : `${s.duration_minutes} min`} — £{(s.price_cents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
        >
          ← Prev
        </button>
        <span className="text-xs font-medium text-gray-700">
          {new Date(weekDates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {' – '}
          {new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-xs font-medium"
        >
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
          {weekDates.map((date) => {
            const d = new Date(date)
            const isToday = date === today.toISOString().split('T')[0]
            return (
              <div
                key={date}
                className={`text-center py-1 sm:py-1.5 rounded text-[10px] sm:text-xs ${
                  isToday ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-100 font-medium text-gray-700'
                }`}
              >
                <div>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div>
                <div className="text-sm sm:text-base font-bold">{d.getDate()}</div>
              </div>
            )
          })}
        </div>

        {/* Time slots grid */}
        {allTimes.length === 0 ? (
          <p className="text-gray-400 text-center py-6 text-sm">No availability this week</p>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {allTimes.map((time) =>
                weekDates.map((date) => {
                  const available = isAvailable(date, time)
                  const selected = isSelected(date, time)
                  const past = isPast(date)
                  const blocked = isBlockedBySelection(date, time)
                  const blockedByBooking = isBlockedByExistingBooking(date, time)
                  const inRange = isInOvernightRange(date)
                  const isStart = isOvernightStartSlot(date, time)
                  const validEnd = isOvernight && overnightStart && isValidOvernightEnd(date, time)

                  return (
                    <button
                      key={`${date}-${time}`}
                      onClick={() => toggleSlot(date, time)}
                      disabled={!available || past || (blocked && !validEnd) || blockedByBooking}
                      className={`py-1 text-[10px] sm:text-xs rounded transition ${
                        isStart
                          ? 'bg-purple-600 text-white font-semibold ring-2 ring-purple-300'
                          : selected
                          ? 'bg-indigo-600 text-white font-semibold'
                          : blockedByBooking
                            ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                            : inRange
                            ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                            : blocked
                            ? 'bg-indigo-100 text-indigo-300 cursor-not-allowed'
                            : validEnd
                            ? 'bg-purple-50 border border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400'
                            : available && !past
                            ? 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {formatTime(time)}
                    </button>
                  )
                }),
              )}
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {isOvernight && !overnightStart && selectedSlots.length === 0
            ? 'Select a drop-off date & time'
            : selectedSlots.length > 0
            ? `${selectedSlots.length} booking${selectedSlots.length > 1 ? 's' : ''} selected`
            : 'Select time slots to book'}
        </span>
        <button
          onClick={handleBookNow}
          disabled={selectedSlots.length === 0}
          className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Book Now →
        </button>
      </div>

      {/* Show selected overnight bookings summary */}
      {selectedSlots.filter((s) => s.isOvernight).length > 0 && (
        <div className="mt-2 space-y-1.5">
          {selectedSlots.filter((s) => s.isOvernight).map((s, i) => (
            <div key={i} className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-purple-800">
                🌙 {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} {s.time}
                {' → '}
                {new Date(s.endDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} {s.endTime}
                {' · '}{s.nights} night{s.nights > 1 ? 's' : ''} · £{(s.priceCents / 100).toFixed(2)}
              </span>
              <button
                onClick={() => setSelectedSlots((prev) => prev.filter((_, idx) => idx !== selectedSlots.indexOf(s)))}
                className="text-purple-500 hover:text-purple-700 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
