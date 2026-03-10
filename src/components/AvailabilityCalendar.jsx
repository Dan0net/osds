import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_SERVICES, getMockSlots } from '../lib/mockData'

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

  const today = new Date()
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const service = walkerServices.find((s) => s.id === selectedService)
  const duration = service?.duration_minutes || 30

  // Compute slots for each day in the week
  const weekSlots = useMemo(() => {
    const result = {}
    for (const date of weekDates) {
      result[date] = getMockSlots(date, duration)
    }
    return result
  }, [weekDates.join(','), duration])

  // Build unified time row list (all unique times across the week)
  const allTimes = useMemo(() => {
    const timeSet = new Set()
    for (const date of weekDates) {
      // Get all 30-min slots regardless of service to show full grid
      const baseSlots = getMockSlots(date, 30)
      baseSlots.forEach((t) => timeSet.add(t))
    }
    return Array.from(timeSet).sort()
  }, [weekDates.join(',')])

  function isAvailable(date, time) {
    return weekSlots[date]?.includes(time) || false
  }

  function isSelected(date, time) {
    return selectedSlots.some((s) => s.date === date && s.time === time)
  }

  // Check if a slot is blocked by a selected booking that spans multiple 30-min slots
  function isBlockedBySelection(date, time) {
    const [h, m] = time.split(':').map(Number)
    const slotMin = h * 60 + m
    return selectedSlots.some((s) => {
      if (s.date !== date) return false
      const [sh, sm] = s.time.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = startMin + s.durationMinutes
      // Blocked if this slot falls within the booking but isn't the start slot
      return slotMin > startMin && slotMin < endMin
    })
  }

  function isPast(date) {
    const todayStr = today.toISOString().split('T')[0]
    return date < todayStr
  }

  function toggleSlot(date, time) {
    if (!isAvailable(date, time) || isPast(date)) return
    const existing = selectedSlots.findIndex(
      (s) => s.date === date && s.time === time,
    )
    if (existing >= 0) {
      setSelectedSlots((prev) => prev.filter((_, i) => i !== existing))
    } else {
      const svc = service || walkerServices[0]
      const [h, m] = time.split(':').map(Number)
      const endMin = h * 60 + m + (svc?.duration_minutes || 30)
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
      setSelectedSlots((prev) => [
        ...prev,
        {
          date,
          time,
          endTime,
          serviceId: svc.id,
          serviceName: svc.name,
          priceCents: svc.price_cents,
          durationMinutes: svc.duration_minutes,
        },
      ])
    }
  }

  function handleBookNow() {
    navigate(`${prefix}/book`, { state: { slots: selectedSlots } })
  }

  const canGoPrev = weekOffset > 0

  return (
    <div>
      {/* Service filter */}
      <div className="mb-4">
        <select
          value={selectedService}
          onChange={(e) => {
            setSelectedService(e.target.value)
            setSelectedSlots([])
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="">All services (30 min slots)</option>
          {walkerServices.filter((s) => s.active).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes} min — £{(s.price_cents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-gray-700">
          {new Date(weekDates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {' – '}
          {new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[560px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDates.map((date) => {
              const d = new Date(date)
              const isToday = date === today.toISOString().split('T')[0]
              return (
                <div
                  key={date}
                  className={`text-center py-2 rounded-lg text-sm ${
                    isToday ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-100 font-medium text-gray-700'
                  }`}
                >
                  <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div className="text-lg">{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Time slots grid */}
          {allTimes.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No availability this week</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {allTimes.map((time) =>
                weekDates.map((date) => {
                  const available = isAvailable(date, time)
                  const selected = isSelected(date, time)
                  const past = isPast(date)
                  const blocked = isBlockedBySelection(date, time)

                  return (
                    <button
                      key={`${date}-${time}`}
                      onClick={() => toggleSlot(date, time)}
                      disabled={!available || past || blocked}
                      className={`py-1.5 text-xs rounded transition ${
                        selected
                          ? 'bg-indigo-600 text-white font-semibold'
                          : blocked
                            ? 'bg-indigo-100 text-indigo-300 cursor-not-allowed'
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
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {selectedSlots.length > 0
            ? `${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''} selected`
            : 'Select time slots to book'}
        </span>
        <button
          onClick={handleBookNow}
          disabled={selectedSlots.length === 0}
          className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Book Now →
        </button>
      </div>
    </div>
  )
}
