import { useState, useMemo } from 'react'

const EVENT_STYLES = {
  incoming: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  mine: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  external: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' },
  requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
}

function getStyle(event) {
  if (event.type === 'external') return EVENT_STYLES.external
  if (event.status === 'requested') return EVENT_STYLES.requested
  if (event.type === 'incoming') return EVENT_STYLES.incoming
  return EVENT_STYLES.mine
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatMonth(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prev = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prev - i)
    cells.push({ date: d, outside: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), outside: true })
    }
  }
  return cells
}

function getWeekDays(date) {
  const day = (date.getDay() + 6) % 7 // Mon=0
  const monday = new Date(date)
  monday.setDate(date.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function jsDayToDbDay(jsDay) {
  return jsDay === 0 ? 7 : jsDay
}

export default function BookingsCalendar({ incoming = [], mine = [], external = [], availability = [], blockedDates = [] }) {
  const [view, setView] = useState('month')
  const [current, setCurrent] = useState(new Date())

  // Normalize all events into a flat list with type + date string
  const allEvents = useMemo(() => {
    const events = []

    for (const b of incoming) {
      if (b.status === 'declined' || b.status === 'cancelled') continue
      if (b.is_overnight && b.end_date) {
        const start = new Date(b.booking_date)
        const end = new Date(b.end_date)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          events.push({
            ...b, type: 'incoming', dateStr: toDateStr(d),
            label: d.getTime() === start.getTime() ? `${b.start_time} ${b.service_name}` :
                   isSameDay(d, end) ? `→ ${b.end_time} ${b.service_name}` :
                   `↕ ${b.service_name}`,
          })
        }
      } else {
        events.push({ ...b, type: 'incoming', dateStr: b.booking_date, label: `${b.start_time} ${b.service_name}` })
      }
    }

    for (const b of mine) {
      if (b.status === 'cancelled') continue
      events.push({ ...b, type: 'mine', dateStr: b.booking_date, label: `${b.start_time} ${b.service_name}` })
    }

    for (const e of external) {
      events.push({ ...e, type: 'external', dateStr: e.date, label: e.allDay ? `${e.title}` : `${e.start_time} ${e.title}` })
    }

    return events
  }, [incoming, mine, external])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const e of allEvents) {
      if (!map[e.dateStr]) map[e.dateStr] = []
      map[e.dateStr].push(e)
    }
    // Sort each day's events by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const tA = a.start_time || '00:00'
        const tB = b.start_time || '00:00'
        return tA.localeCompare(tB)
      })
    }
    return map
  }, [allEvents])

  // Build lookup maps for availability
  const availByDay = useMemo(() => {
    const map = {}
    for (const a of availability) {
      map[a.day_of_week] = {
        start: timeToMinutes(a.start_time?.slice(0, 5) || '09:00'),
        end: timeToMinutes(a.end_time?.slice(0, 5) || '17:00'),
      }
    }
    return map
  }, [availability])

  const blockedSet = useMemo(() => {
    const set = new Set()
    for (const b of blockedDates) set.add(b.date)
    return set
  }, [blockedDates])

  function isAvailable(dateStr, jsDay, hourMinutes) {
    if (blockedSet.has(dateStr)) return false
    const dbDay = jsDayToDbDay(jsDay)
    const window = availByDay[dbDay]
    if (!window) return false
    return hourMinutes >= window.start && hourMinutes < window.end
  }

  function dayHasAvailability(dateStr, jsDay) {
    if (blockedSet.has(dateStr)) return false
    return !!availByDay[jsDayToDbDay(jsDay)]
  }

  const hasAvailability = availability.length > 0

  const today = new Date()
  const todayStr = toDateStr(today)

  function navigate(dir) {
    const next = new Date(current)
    if (view === 'month') {
      next.setMonth(next.getMonth() + dir)
    } else {
      next.setDate(next.getDate() + dir * 7)
    }
    setCurrent(next)
  }

  function goToday() {
    setCurrent(new Date())
  }

  // --- Month View ---
  function renderMonth() {
    const cells = getMonthDays(current.getFullYear(), current.getMonth())
    return (
      <div className="grid grid-cols-7">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-xs font-medium text-gray-500 text-center py-2">{d}</div>
        ))}
        {cells.map(({ date, outside }, i) => {
          const ds = toDateStr(date)
          const dayEvents = eventsByDate[ds] || []
          const isToday = ds === todayStr
          const hasAvail = hasAvailability && !outside && dayHasAvailability(ds, date.getDay())
          const isBlocked = hasAvailability && !outside && blockedSet.has(ds)
          return (
            <div
              key={i}
              className={`min-h-[5rem] border-t border-gray-100 p-1 ${outside ? 'bg-gray-50' : hasAvail ? 'bg-emerald-50/60' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? 'bg-indigo-600 text-white' : outside ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </span>
                {isBlocked && <span className="text-[9px] text-red-400 font-medium">Blocked</span>}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.map((ev, j) => {
                  const style = getStyle(ev)
                  return (
                    <div key={j} className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 ${style.bg} ${style.text}`}>
                      {ev.label}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- Week View ---
  function renderWeek() {
    const days = getWeekDays(current)
    const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 07:00 – 19:00

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200">
            <div />
            {days.map((d) => {
              const ds = toDateStr(d)
              const isToday = ds === todayStr
              return (
                <div key={ds} className="text-center py-2">
                  <span className="text-xs text-gray-500">
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <br />
                  <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  }`}>
                    {d.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] relative">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="text-right pr-2 text-xs text-gray-400 h-12 flex items-start justify-end -mt-2">
                  {`${String(hour).padStart(2, '0')}:00`}
                </div>
                {days.map((d) => {
                  const ds = toDateStr(d)
                  const hourMin = hour * 60
                  const cellAvail = hasAvailability && isAvailable(ds, d.getDay(), hourMin)
                  return (
                    <div key={`${ds}-${hour}`} className={`border-t border-l border-gray-100 h-12 relative ${cellAvail ? 'bg-emerald-50' : ''}`}>
                      {/* Render events that start in this hour */}
                      {(eventsByDate[ds] || [])
                        .filter((ev) => {
                          const st = ev.start_time || '00:00'
                          const stH = parseInt(st.split(':')[0])
                          return stH === hour
                        })
                        .map((ev, j) => {
                          const style = getStyle(ev)
                          const startMin = timeToMinutes(ev.start_time || '00:00')
                          const endMin = ev.end_time ? timeToMinutes(ev.end_time) : startMin + 30
                          const duration = Math.max(endMin - startMin, 15)
                          const topOffset = (startMin - hour * 60) * (48 / 60) // 48px = 1 hour
                          const height = Math.min(duration * (48 / 60), 48 * 4) // cap at 4 hours
                          return (
                            <div
                              key={j}
                              className={`absolute left-0.5 right-0.5 rounded text-[10px] leading-tight px-1 py-0.5 overflow-hidden border ${style.bg} ${style.text} ${style.border}`}
                              style={{ top: `${topOffset}px`, height: `${height}px`, zIndex: 10 + j }}
                            >
                              {ev.label}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" aria-label="Previous">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goToday} className="text-sm font-medium text-gray-700 hover:bg-gray-100 px-2 py-1 rounded">Today</button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" aria-label="Next">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-900 ml-2">
            {view === 'month'
              ? formatMonth(current)
              : (() => {
                  const days = getWeekDays(current)
                  const first = days[0]
                  const last = days[6]
                  if (first.getMonth() === last.getMonth()) {
                    return `${first.getDate()}–${last.getDate()} ${formatMonth(first)}`
                  }
                  return `${first.getDate()} ${first.toLocaleDateString('en-GB', { month: 'short' })} – ${last.getDate()} ${last.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                })()
            }
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${view === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${view === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="p-2">
        {view === 'month' ? renderMonth() : renderWeek()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-3 pb-3 text-xs text-gray-500">
        {hasAvailability && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />Available</span>}
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Incoming</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />Requested</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />My bookings</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" />External</span>
      </div>
    </div>
  )
}
