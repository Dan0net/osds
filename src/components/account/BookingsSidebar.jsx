import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, addDays, isToday, isTomorrow } from 'date-fns'

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
      <span
        className="w-0.5 rounded-full shrink-0 self-stretch"
        style={{ backgroundColor: event.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm font-medium truncate ${inactive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {event.primaryLabel}
          </span>
          {event.startLabel && (
            <span className={`text-xs shrink-0 ${inactive ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {event.startLabel}
            </span>
          )}
        </div>
        {(event.secondaryLabel || event.durationLabel) && (
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-xs truncate ${inactive ? 'text-gray-400' : 'text-gray-500'}`}>
              {event.secondaryLabel}
            </span>
            {event.durationLabel && (
              <span className={`text-[11px] shrink-0 ${inactive ? 'text-gray-400' : 'text-gray-400'}`}>
                {event.durationLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
  if (event.external) {
    return <div className="flex items-stretch gap-2.5 py-1">{inner}</div>
  }
  return (
    <Link
      to={`/account/bookings/${event.id}`}
      state={{ from: '/account/bookings' }}
      className={`flex items-stretch gap-2.5 py-1 transition-opacity ${inactive ? 'opacity-60 hover:opacity-80' : 'hover:opacity-70'}`}
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

export default function BookingsSidebar({
  eventsByDay,
  selectedDate,
  onSelectDate,
  setupItems,
  drawerHeight = 'half',
  onToggleDrawerHeight,
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const PAST_DAYS = 30
  const [days, setDays] = useState(() => buildDays(format(addDays(new Date(), -PAST_DAYS), 'yyyy-MM-dd'), PAST_DAYS + 90))

  const scrollRef = useRef(null)
  const dayRefs = useRef({})
  const sentinelRef = useRef(null)
  const suppressScrollUntilRef = useRef(0)
  const fromScrollRef = useRef(false)
  const initialScrollDoneRef = useRef(false)

  // Update selected day to the section currently at the top of the scroll viewport
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

  // Extend the day window when the bottom sentinel approaches
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

  // Scroll to selected date when prop changes externally (calendar click).
  // Skip when the change came from the sidebar's own scroll listener.
  useEffect(() => {
    if (!selectedDate) return
    if (fromScrollRef.current) {
      fromScrollRef.current = false
      return
    }
    const key = format(selectedDate, 'yyyy-MM-dd')

    // Extend the window if the target is past the end
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
    if (initialScrollDoneRef.current && Math.abs(offsetWithin) < 100) return // already close to top — don't fight user scroll

    const behavior = initialScrollDoneRef.current ? 'smooth' : 'auto'
    initialScrollDoneRef.current = true
    suppressScrollUntilRef.current = Date.now() + 600
    el.scrollIntoView({ block: 'start', behavior })
  }, [selectedDate, days])

  const [dragActive, setDragActive] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartRef = useRef({ y: 0, h: 0 })

  function handleDragPointerDown(e) {
    if (e.target.closest('button')) return
    const heightPx = drawerHeight === 'full'
      ? window.innerHeight - 56
      : window.innerHeight * 0.5
    dragStartRef.current = { y: e.clientY, h: heightPx }
    setDragActive(true)
    setDragOffset(0)

    function move(ev) {
      setDragOffset(ev.clientY - dragStartRef.current.y)
    }
    function up(ev) {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
      const dy = ev.clientY - dragStartRef.current.y
      setDragActive(false)
      setDragOffset(0)
      const TAP = 6
      const THRESHOLD = 40
      if (Math.abs(dy) < TAP) onToggleDrawerHeight()
      else if (dy < -THRESHOLD && drawerHeight === 'half') onToggleDrawerHeight()
      else if (dy > THRESHOLD && drawerHeight === 'full') onToggleDrawerHeight()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
  }

  const list = (
    <>
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
            <h3 className="text-sm font-semibold text-gray-900 sticky top-0 bg-white py-1.5 z-[1] flex items-center gap-1.5">
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
    </>
  )

  if (isMobile) {
    const fullMax = `calc(100dvh - 56px - env(safe-area-inset-bottom) - 4rem)`
    const baseHeight = drawerHeight === 'full' ? fullMax : '50dvh'
    const height = dragActive
      ? `${Math.max(80, Math.min(window.innerHeight - 56 - 64, dragStartRef.current.h - dragOffset))}px`
      : baseHeight
    return (
      <div
        className="lg:hidden fixed left-0 right-0 z-30 bg-white border-t border-gray-200 rounded-t-2xl shadow-xl flex flex-col"
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          height,
          transition: dragActive ? 'none' : 'height 200ms ease-out',
        }}
        role="region"
        aria-label="Bookings"
      >
        <div
          className="rounded-t-2xl px-4 pt-2 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handleDragPointerDown}
        >
          <div className="flex justify-center">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          {list}
        </div>
      </div>
    )
  }

  return (
    <aside
      className="hidden lg:flex lg:flex-col w-80 bg-white border-t border-l border-gray-200 lg:fixed lg:right-0 lg:bottom-0 lg:top-[5.25rem] lg:rounded-tl-xl lg:shadow-sm"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {list}
      </div>
    </aside>
  )
}
