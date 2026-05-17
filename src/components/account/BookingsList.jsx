import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, addDays, isToday, isTomorrow } from 'date-fns'
import MapButton from './MapButton'

function dayHeading(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE d MMMM')
}

function buildDays(startStr, count) {
  const start = parseISO(startStr)
  return Array.from({ length: count }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

function EventRow({ event }) {
  const inactive = event.inactive
  const inner = (
    <>
      <span className="w-0.5 rounded-full shrink-0 self-stretch" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <span className={`block text-sm font-medium truncate ${inactive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {event.primaryLabel}
        </span>
        {event.secondaryLabel && (
          <span className={`block text-xs truncate ${inactive ? 'text-gray-400' : 'text-gray-500'}`}>
            {event.secondaryLabel}
          </span>
        )}
      </div>
      {event.postcode && <MapButton postcode={event.postcode} size={28} className="p-1" />}
      {(event.startLabel || event.durationLabel) && (
        <div className="flex flex-col items-end justify-center shrink-0">
          {event.startLabel && (
            <span className={`text-xs ${inactive ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {event.startLabel}
            </span>
          )}
          {event.durationLabel && (
            <span className="text-[11px] text-gray-400">{event.durationLabel}</span>
          )}
        </div>
      )}
    </>
  )
  if (event.external) {
    return <div className="flex items-center gap-2.5 py-1">{inner}</div>
  }
  return (
    <Link
      to={`/account/bookings/${event.id}`}
      state={{ from: '/account/bookings' }}
      className={`flex items-center gap-2.5 py-1 transition-opacity ${inactive ? 'opacity-60 hover:opacity-80' : 'hover:opacity-70'}`}
    >
      {inner}
    </Link>
  )
}

function SetupSection({ items }) {
  if (!items || items.every((i) => i.done)) return null
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Get your page live</h3>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
        {items.map((item) => {
          const className = `flex items-center gap-2 px-2.5 py-2 rounded-lg border transition ${
            item.done
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
          }`
          const inner = (
            <>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                item.done ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {item.done ? '✓' : '·'}
              </span>
              <span className={`text-xs font-medium ${item.done ? 'text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </>
          )
          if (item.onClick) {
            return (
              <button key={item.label} type="button" onClick={item.onClick} className={'cursor-pointer text-left ' + className}>
                {inner}
              </button>
            )
          }
          return (
            <Link key={item.label} to={item.link} className={className}>
              {inner}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const PAST_DAYS = 30

export default function BookingsList({ eventsByDay, selectedDate, onSelectDate, setupItems, scrollRef: externalScrollRef, className = '' }) {
  const [days, setDays] = useState(() => buildDays(format(addDays(new Date(), -PAST_DAYS), 'yyyy-MM-dd'), PAST_DAYS + 90))

  const internalScrollRef = useRef(null)
  const scrollRef = externalScrollRef || internalScrollRef
  const dayRefs = useRef({})
  const sentinelRef = useRef(null)
  const suppressScrollUntilRef = useRef(0)
  const fromScrollRef = useRef(false)
  const initialScrollDoneRef = useRef(false)

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    let rafId = null
    function check() {
      rafId = null
      if (Date.now() < suppressScrollUntilRef.current) return
      const rootTop = root.getBoundingClientRect().top
      let bestDate = null
      let bestDelta = -Infinity
      for (const d of days) {
        const el = dayRefs.current[d]
        if (!el) continue
        const delta = el.getBoundingClientRect().top - rootTop
        if (delta <= 4 && delta > bestDelta) {
          bestDelta = delta
          bestDate = d
        }
      }
      if (!bestDate) bestDate = days[0]
      if (!bestDate) return
      const currentKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
      if (bestDate === currentKey) return
      fromScrollRef.current = true
      onSelectDate(parseISO(bestDate))
    }
    function onScroll() {
      if (rafId != null) return
      rafId = requestAnimationFrame(check)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [days, onSelectDate, selectedDate])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setDays((prev) => {
          const last = prev[prev.length - 1]
          const nextStart = format(addDays(parseISO(last), 1), 'yyyy-MM-dd')
          return [...prev, ...buildDays(nextStart, 30)]
        })
      }
    }, { root, rootMargin: '0px 0px 500px 0px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [days.length])

  useEffect(() => {
    if (!selectedDate) return
    if (fromScrollRef.current) {
      fromScrollRef.current = false
      return
    }
    const key = format(selectedDate, 'yyyy-MM-dd')

    if (days.length > 0 && key > days[days.length - 1]) {
      const lastDate = parseISO(days[days.length - 1])
      const targetDate = parseISO(key)
      const daysToAdd = Math.ceil((targetDate - lastDate) / (1000 * 60 * 60 * 24)) + 5
      setDays((prev) => {
        const nextStart = format(addDays(parseISO(prev[prev.length - 1]), 1), 'yyyy-MM-dd')
        return [...prev, ...buildDays(nextStart, daysToAdd)]
      })
      return
    }

    const el = dayRefs.current[key]
    const root = scrollRef.current
    if (!el || !root) return

    const elRect = el.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    const offsetWithin = elRect.top - rootRect.top
    if (initialScrollDoneRef.current && Math.abs(offsetWithin) < 100) return

    const behavior = initialScrollDoneRef.current ? 'smooth' : 'auto'
    initialScrollDoneRef.current = true
    suppressScrollUntilRef.current = Date.now() + 600
    el.scrollIntoView({ block: 'start', behavior })
  }, [selectedDate, days])

  return (
    <div ref={scrollRef} className={`overflow-y-auto overscroll-contain px-4 ${className}`}>
      <SetupSection items={setupItems} />
      {days.map((date) => {
        const events = eventsByDay[date] || []
        const dateIsToday = isToday(parseISO(date))
        return (
          <section
            key={date}
            ref={(el) => {
              if (el) dayRefs.current[date] = el
              else delete dayRefs.current[date]
            }}
            data-date={date}
            className="mb-4"
          >
            <h3 className="text-sm font-semibold text-gray-900 sticky -top-px bg-white -mx-4 px-4 pt-[7px] pb-1.5 z-[1] flex items-center gap-1.5">
              {dateIsToday && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
              {dayHeading(date)}
            </h3>
            {events.length === 0 ? (
              <p className="text-xs text-gray-400">No bookings.</p>
            ) : (
              <div>
                {events.map((event, i) => (
                  <EventRow key={event.id + '-' + i} event={event} />
                ))}
              </div>
            )}
          </section>
        )
      })}
      <div ref={sentinelRef} aria-hidden className="h-1" />
    </div>
  )
}
