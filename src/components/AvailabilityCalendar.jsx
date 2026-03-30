import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clientPriceCents } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d)
    date.setDate(d.getDate() + i)
    return date.toISOString().split('T')[0]
  })
}

function timeStr(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export default function AvailabilityCalendar({ services, walkerId, initialServiceId }) {
  const walkerServices = services || []
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const { user } = useAuth()

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedService, setSelectedService] = useState(initialServiceId || '')
  const [selectedSlots, setSelectedSlots] = useState([])
  const [weekSlots, setWeekSlots] = useState({})
  const [fullTimeGrid, setFullTimeGrid] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [mobileOffset, setMobileOffset] = useState(0)
  const [hoverCell, setHoverCell] = useState(null) // { date, minutes }
  const [dragging, setDragging] = useState(null) // { index, startX, startY, moved }
  const [dragCell, setDragCell] = useState(null) // { date, minutes } — where the dragged event would land
  const gridRef = useRef(null)

  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < 640) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (initialServiceId && initialServiceId !== selectedService) {
      setSelectedService(initialServiceId)
    }
  }, [initialServiceId])

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const service = walkerServices.find((s) => s.id === selectedService)
  const duration = service?.duration_minutes || 30
  const isOvernight = service?.service_type === 'overnight'

  // Overnight defaults: drop-off 18:00, pick-up 10:00 next day
  const OVERNIGHT_DROP = 18 * 60 // 18:00
  const OVERNIGHT_PICK = 10 * 60 // 10:00

  const weekKey = weekDates.join(',')
  useEffect(() => {
    if (!walkerId) return
    let cancelled = false
    setLoadingSlots(true)
    async function fetchWeek() {
      const result = {}
      const allTimesSet = new Set()
      const promises = weekDates.map(async (date) => {
        const params = new URLSearchParams({ walker_id: walkerId, date, duration_minutes: '30', service_type: 'standard' })
        try {
          const res = await fetch(`/.netlify/functions/get-availability?${params}`)
          const json = await res.json()
          result[date] = json.data?.slots || []
          for (const t of (json.data?.allSlots || json.data?.slots || [])) allTimesSet.add(t)
        } catch { result[date] = [] }
      })
      await Promise.all(promises)
      if (!cancelled) {
        setWeekSlots(result)
        setFullTimeGrid(Array.from(allTimesSet).sort())
        setLoadingSlots(false)
      }
    }
    fetchWeek()
    return () => { cancelled = true }
  }, [walkerId, weekKey])

  // Derive hour range — expand to show overnight drop-off/pick-up hours when needed
  const baseStartHour = fullTimeGrid.length > 0 ? Math.max(7, parseInt(fullTimeGrid[0].split(':')[0])) : 7
  const baseEndHour = fullTimeGrid.length > 0 ? Math.min(20, parseInt(fullTimeGrid[fullTimeGrid.length - 1].split(':')[0]) + 1) : 19
  const hasOvernightSlots = isOvernight || selectedSlots.some((s) => s.isOvernight)
  const startHour = hasOvernightSlots ? Math.min(baseStartHour, Math.floor(OVERNIGHT_PICK / 60)) : baseStartHour
  const endHour = hasOvernightSlots ? Math.max(baseEndHour, Math.floor(OVERNIGHT_DROP / 60) + 1) : baseEndHour
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour)
  const PX_PER_HOUR = 48

  function isSlotAvailable(date, time) {
    const slots = weekSlots[date]
    if (!slots || !slots.includes(time)) return false
    if (isOvernight) return true
    const slotsNeeded = Math.ceil(duration / 30)
    if (slotsNeeded <= 1) return true
    const [h, m] = time.split(':').map(Number)
    const startMin = h * 60 + m
    for (let i = 1; i < slotsNeeded; i++) {
      const nextTime = timeStr(startMin + i * 30)
      if (!slots.includes(nextTime)) return false
    }
    return true
  }

  // Check if an overnight stay on this date would conflict with existing bookings or selections
  function isOvernightBlocked(date) {
    const nextDate = getNextDate(date)
    // Check server-side availability: evening slots on drop-off day must be free
    const dropSlots = weekSlots[date] || []
    for (let min = OVERNIGHT_DROP; min < endHour * 60; min += 30) {
      const t = timeStr(min)
      if (dropSlots.includes(t)) continue // slot exists = available window
      // If there's no slot at all for this time, it could be outside availability — that's fine for overnight
    }
    // Check for booked events during evening (drop-off day, from OVERNIGHT_DROP onwards)
    // These are already excluded from the slots by the API — so if a slot at 18:00+ is missing, it's booked
    for (let min = OVERNIGHT_DROP; min < endHour * 60; min += 30) {
      if (isBlockedBySelection(date, min)) return true
    }
    // Check for booked events during morning (pick-up day, before OVERNIGHT_PICK)
    for (let min = startHour * 60; min < OVERNIGHT_PICK; min += 30) {
      if (isBlockedBySelection(nextDate, min)) return true
    }
    // Check server-side: pick-up morning slots — if any 30-min slot before pick-up time is unavailable (booked), block
    const pickSlots = weekSlots[nextDate] || []
    for (let min = startHour * 60; min < OVERNIGHT_PICK; min += 30) {
      const t = timeStr(min)
      // If this time should be in the availability window but isn't in the slot list, it's booked
      if (pickSlots.length > 0 && !pickSlots.includes(t)) {
        // Only flag if it's within the walker's normal hours (some early slots may just not exist)
        if (min >= baseStartHour * 60) return true
      }
    }
    // Also check: already have an overnight on this date or the next date
    if (selectedSlots.some((s) => s.isOvernight && (s.date === date || s.date === nextDate || s.endDate === date))) return true
    return false
  }

  function isBlockedBySelection(date, minutes) {
    return selectedSlots.some((s) => {
      if (s.isOvernight) {
        // Drop-off day: block from drop-off time onwards
        if (date === s.date) {
          const [sh, sm] = s.time.split(':').map(Number)
          return minutes >= sh * 60 + sm
        }
        // Pick-up day: block before pick-up time
        if (date === s.endDate) {
          const [eh, em] = s.endTime.split(':').map(Number)
          return minutes < eh * 60 + em
        }
        // Days in between: block all
        if (date > s.date && date < s.endDate) return true
        return false
      }
      // Standard: block the duration of the booking
      if (s.date !== date) return false
      const [sh, sm] = s.time.split(':').map(Number)
      const sStart = sh * 60 + sm
      const sEnd = sStart + s.durationMinutes
      return minutes >= sStart && minutes < sEnd
    })
  }

  const visibleDates = isMobile ? weekDates.slice(mobileOffset, mobileOffset + 3) : weekDates
  const gridCols = isMobile ? 3 : 7

  function getNextDate(dateStr) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  // Shared: resolve screen coordinates to a calendar cell
  function resolveCell(clientX, clientY) {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const timeColWidth = 40
    const colWidth = (rect.width - timeColWidth) / gridCols
    const colIndex = Math.floor((x - timeColWidth) / colWidth)
    if (colIndex < 0 || colIndex >= gridCols) return null
    const date = visibleDates[colIndex]
    if (!date || date < todayStr) return null

    if (isOvernight) {
      if (isOvernightBlocked(date)) return null
      return { date, minutes: OVERNIGHT_DROP }
    }
    const totalMinutes = startHour * 60 + (y / PX_PER_HOUR) * 60
    const snappedMinutes = Math.floor(totalMinutes / 30) * 30
    const time = timeStr(snappedMinutes)
    if (!isSlotAvailable(date, time) || isBlockedBySelection(date, snappedMinutes)) return null
    return { date, minutes: snappedMinutes }
  }

  function handleGridMouseMove(e) {
    if (dragging) return // don't update hover while dragging
    setHoverCell(resolveCell(e.clientX, e.clientY))
  }

  // Touch: tap to place a booking directly (bypasses hoverCell state)
  function handleTouchEnd(e) {
    if (!e.changedTouches.length) return
    const touch = e.changedTouches[0]
    const cell = resolveCell(touch.clientX, touch.clientY)
    if (!cell) return
    e.preventDefault()

    const svc = service || walkerServices[0]
    if (!svc) return

    if (isOvernight) {
      if (isOvernightBlocked(cell.date)) return
      const nextDate = getNextDate(cell.date)
      setSelectedSlots((prev) => [...prev, {
        date: cell.date, time: timeStr(OVERNIGHT_DROP), endDate: nextDate, endTime: timeStr(OVERNIGHT_PICK),
        serviceId: svc.id, serviceName: svc.name, priceCents: clientPriceCents(svc.price_cents),
        durationMinutes: svc.duration_minutes, isOvernight: true, nights: 1,
      }])
    } else {
      const time = timeStr(cell.minutes)
      if (selectedSlots.some((s) => s.date === cell.date && s.time === time)) return
      const endMin = cell.minutes + (svc.duration_minutes || 30)
      setSelectedSlots((prev) => [...prev, {
        date: cell.date, time, endTime: timeStr(endMin), endDate: cell.date,
        serviceId: svc.id, serviceName: svc.name, priceCents: clientPriceCents(svc.price_cents),
        durationMinutes: svc.duration_minutes, isOvernight: false, nights: 0,
      }])
    }
  }

  function handleGridClick() {
    if (dragging) return // don't place new event while dragging
    if (!hoverCell) return
    const svc = service || walkerServices[0]
    if (!svc) return

    if (isOvernight) {
      const date = hoverCell.date
      const nextDate = getNextDate(date)
      if (isOvernightBlocked(date)) return
      setSelectedSlots((prev) => [
        ...prev,
        {
          date,
          time: timeStr(OVERNIGHT_DROP),
          endDate: nextDate,
          endTime: timeStr(OVERNIGHT_PICK),
          serviceId: svc.id,
          serviceName: svc.name,
          priceCents: clientPriceCents(svc.price_cents),
          durationMinutes: svc.duration_minutes,
          isOvernight: true,
          nights: 1,
        },
      ])
    } else {
      const time = timeStr(hoverCell.minutes)
      if (selectedSlots.some((s) => s.date === hoverCell.date && s.time === time)) return
      const endMin = hoverCell.minutes + (svc.duration_minutes || 30)
      setSelectedSlots((prev) => [
        ...prev,
        {
          date: hoverCell.date,
          time,
          endTime: timeStr(endMin),
          endDate: hoverCell.date,
          serviceId: svc.id,
          serviceName: svc.name,
          priceCents: clientPriceCents(svc.price_cents),
          durationMinutes: svc.duration_minutes,
          isOvernight: false,
          nights: 0,
        },
      ])
    }
  }

  function removeSlot(index) {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Drag to move ---
  const DRAG_THRESHOLD = 5 // px before we consider it a drag vs click

  function startDrag(index, clientX, clientY, e) {
    e.stopPropagation()
    e.preventDefault()
    setDragging({ index, startX: clientX, startY: clientY, moved: false })
    setDragCell(null)
  }

  function onDragMove(clientX, clientY) {
    if (!dragging) return
    const dx = clientX - dragging.startX
    const dy = clientY - dragging.startY
    if (!dragging.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    if (!dragging.moved) setDragging((d) => ({ ...d, moved: true }))
    const cell = resolveCell(clientX, clientY)
    setDragCell(cell)
  }

  function endDrag() {
    if (!dragging) return
    if (dragging.moved && dragCell) {
      // Move the slot to the new position
      setSelectedSlots((prev) => prev.map((slot, i) => {
        if (i !== dragging.index) return slot
        if (slot.isOvernight) {
          const nextDate = getNextDate(dragCell.date)
          return { ...slot, date: dragCell.date, time: timeStr(OVERNIGHT_DROP), endDate: nextDate, endTime: timeStr(OVERNIGHT_PICK) }
        }
        const endMin = dragCell.minutes + slot.durationMinutes
        return { ...slot, date: dragCell.date, time: timeStr(dragCell.minutes), endTime: timeStr(endMin), endDate: dragCell.date }
      }))
    } else if (!dragging.moved) {
      // It was a click, not a drag — remove
      removeSlot(dragging.index)
    }
    setDragging(null)
    setDragCell(null)
  }

  // Global listeners for drag (mouse up / move can happen outside the grid)
  useEffect(() => {
    if (!dragging) return
    function onMouseMove(e) { onDragMove(e.clientX, e.clientY) }
    function onMouseUp() { endDrag() }
    function onTouchMove(e) {
      if (e.touches.length) onDragMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    function onTouchEnd() { endDrag() }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [dragging, dragCell])

  function handleBookNow() {
    if (!user) {
      localStorage.setItem('osds_bookingIntent', JSON.stringify({
        walkerSlug: walkerParam || null, walkerId, slots: selectedSlots, savedAt: Date.now(),
      }))
      navigate(`/login?returnTo=${encodeURIComponent(prefix + '/book')}`)
      return
    }
    navigate(`${prefix}/book`, { state: { slots: selectedSlots, walkerId } })
  }

  const canGoPrev = weekOffset > 0

  return (
    <div>
      {/* Service filter — hidden when parent controls selection */}
      {!initialServiceId && (
        <div className="mb-3">
          <select
            value={selectedService}
            onChange={(e) => { setSelectedService(e.target.value) }}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-full sm:w-auto focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">All services (30 min slots)</option>
            {walkerServices.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.service_type === 'overnight' ? 'per night' : `${s.duration_minutes} min`} — £{(clientPriceCents(s.price_cents) / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { setWeekOffset((w) => w - 1); setMobileOffset(0) }} disabled={!canGoPrev} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-xs font-medium">← Prev</button>
        <span className="text-xs font-medium text-gray-700">
          {new Date(weekDates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          {' – '}
          {new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => { setWeekOffset((w) => w + 1); setMobileOffset(0) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-xs font-medium">Next →</button>
      </div>

      {/* Mobile slide controls */}
      {isMobile && (
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setMobileOffset((o) => Math.max(0, o - 1))} disabled={mobileOffset === 0} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1">← Earlier</button>
          <button onClick={() => setMobileOffset((o) => Math.min(4, o + 1))} disabled={mobileOffset >= 4} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1">Later →</button>
        </div>
      )}

      {/* Time grid — always rendered, loading overlay on top */}
      {(
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `2.5rem repeat(${gridCols}, 1fr)` }}>
            <div />
            {visibleDates.map((date) => {
              const d = new Date(date)
              const isToday = date === todayStr
              return (
                <div key={date} className={`text-center py-1.5 text-xs border-l border-gray-100 ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                  <div>{d.toLocaleDateString('en-GB', { weekday: isMobile ? 'short' : 'short' })}</div>
                  <div className="text-sm font-bold">{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Grid body */}
          <div
            ref={gridRef}
            className="relative cursor-pointer select-none"
            style={{ height: `${Math.max(hours.length, 10) * PX_PER_HOUR}px` }}
            onMouseMove={!loadingSlots ? handleGridMouseMove : undefined}
            onMouseLeave={() => setHoverCell(null)}
            onClick={!loadingSlots ? handleGridClick : undefined}
            onTouchEnd={!loadingSlots ? handleTouchEnd : undefined}
          >
            {/* Loading overlay */}
            {loadingSlots && (
              <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Hour rows */}
            {hours.map((hour, i) => (
              <div key={hour} className="absolute left-0 right-0 flex" style={{ top: `${i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}>
                <div className="w-10 shrink-0 text-right pr-1.5 text-[10px] text-gray-400 -mt-1.5">{`${String(hour).padStart(2, '0')}:00`}</div>
                <div className="flex-1 border-t border-gray-100 grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                  {visibleDates.map((date) => {
                    const isPast = date < todayStr
                    const hasAvail = weekSlots[date]?.some((t) => {
                      const h = parseInt(t.split(':')[0])
                      return h === hour
                    })
                    return (
                      <div
                        key={`${date}-${hour}`}
                        className={`border-l border-gray-100 ${isPast ? 'bg-gray-50' : hasAvail ? '' : 'bg-gray-50/50'}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Unavailable time blocks */}
            {visibleDates.map((date, colIndex) => {
              const timeColWidth = 40
              const blocks = []
              for (let min = startHour * 60; min < endHour * 60; min += 30) {
                const time = timeStr(min)
                const isPast = date < todayStr
                if (isPast || !isSlotAvailable(date, time)) {
                  blocks.push(min)
                }
              }
              // Merge consecutive blocks into ranges
              const ranges = []
              for (const min of blocks) {
                const last = ranges[ranges.length - 1]
                if (last && last.end === min) {
                  last.end = min + 30
                } else {
                  ranges.push({ start: min, end: min + 30 })
                }
              }
              return ranges.map((r, i) => (
                <div
                  key={`unavail-${date}-${i}`}
                  className="absolute bg-gray-100/80 pointer-events-none"
                  style={{
                    top: `${((r.start - startHour * 60) / 60) * PX_PER_HOUR}px`,
                    height: `${((r.end - r.start) / 60) * PX_PER_HOUR}px`,
                    left: `calc(${timeColWidth}px + ${colIndex} * ((100% - ${timeColWidth}px) / ${gridCols}))`,
                    width: `calc((100% - ${timeColWidth}px) / ${gridCols})`,
                  }}
                />
              ))
            })}

            {/* Hover ghost event */}
            {hoverCell && (() => {
              const colIndex = visibleDates.indexOf(hoverCell.date)
              if (colIndex < 0) return null
              const timeColWidth = 40
              const colLeft = `calc(${timeColWidth}px + ${colIndex} * ((100% - ${timeColWidth}px) / ${gridCols}))`
              const colWidth = `calc((100% - ${timeColWidth}px) / ${gridCols} - 2px)`

              if (isOvernight) {
                // Show evening block on hover day + morning block on next day
                const blocks = []
                const dropTopPx = ((OVERNIGHT_DROP - startHour * 60) / 60) * PX_PER_HOUR
                const dropHeightPx = hours.length * PX_PER_HOUR - dropTopPx
                blocks.push(
                  <div key="ghost-drop" className="absolute pointer-events-none rounded-t bg-purple-400/30 border border-purple-400/50 border-dashed px-1.5 py-0.5 text-[10px] text-purple-700 overflow-hidden"
                    style={{ top: `${dropTopPx}px`, height: `${dropHeightPx}px`, left: colLeft, width: colWidth }}>
                    Drop-off {timeStr(OVERNIGHT_DROP)}
                  </div>
                )
                // Next day pick-up ghost
                const nextDate = getNextDate(hoverCell.date)
                const nextColIndex = visibleDates.indexOf(nextDate)
                if (nextColIndex >= 0) {
                  const pickHeightPx = ((OVERNIGHT_PICK - startHour * 60) / 60) * PX_PER_HOUR
                  const nextColLeft = `calc(${timeColWidth}px + ${nextColIndex} * ((100% - ${timeColWidth}px) / ${gridCols}))`
                  blocks.push(
                    <div key="ghost-pick" className="absolute pointer-events-none rounded-b bg-purple-400/30 border border-purple-400/50 border-dashed px-1.5 text-[10px] text-purple-700 overflow-hidden flex items-end pb-0.5"
                      style={{ top: 0, height: `${pickHeightPx}px`, left: nextColLeft, width: colWidth }}>
                      Pick-up {timeStr(OVERNIGHT_PICK)}
                    </div>
                  )
                }
                return blocks
              }

              // Standard ghost
              const topPx = ((hoverCell.minutes - startHour * 60) / 60) * PX_PER_HOUR
              const heightPx = (duration / 60) * PX_PER_HOUR
              return (
                <div
                  className="absolute pointer-events-none rounded bg-indigo-400/30 border border-indigo-400/50 border-dashed px-1.5 py-0.5 text-[10px] text-indigo-700 overflow-hidden"
                  style={{ top: `${topPx}px`, height: `${heightPx}px`, left: colLeft, width: colWidth }}
                >
                  {timeStr(hoverCell.minutes)} {service?.name || 'Book'}
                </div>
              )
            })()}

            {/* Selected events */}
            {selectedSlots.map((slot, realIndex) => {
              if (slot.isOvernight) return null
              const isDragging = dragging?.index === realIndex && dragging.moved
              if (isDragging) return null // hide original while dragging
              const colIndex = visibleDates.indexOf(slot.date)
              if (colIndex < 0) return null
              const [h, m] = slot.time.split(':').map(Number)
              const slotMin = h * 60 + m
              const topPx = ((slotMin - startHour * 60) / 60) * PX_PER_HOUR
              const heightPx = (slot.durationMinutes / 60) * PX_PER_HOUR
              const timeColWidth = 40
              return (
                <div
                  key={realIndex}
                  onMouseDown={(e) => { if (!e.target.closest('[data-remove]')) startDrag(realIndex, e.clientX, e.clientY, e) }}
                  onTouchStart={(e) => { if (!e.target.closest('[data-remove]') && e.touches.length) startDrag(realIndex, e.touches[0].clientX, e.touches[0].clientY, e) }}
                  className="absolute rounded bg-indigo-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group cursor-grab active:cursor-grabbing hover:bg-indigo-700 transition-colors"
                  style={{
                    top: `${topPx}px`,
                    height: `${Math.max(heightPx, 20)}px`,
                    left: `calc(${timeColWidth}px + ${colIndex} * ((100% - ${timeColWidth}px) / ${gridCols}) + 1px)`,
                    width: `calc((100% - ${timeColWidth}px) / ${gridCols} - 3px)`,
                    zIndex: 20,
                  }}
                >
                  <span className="truncate leading-tight">{slot.time} {slot.serviceName}</span>
                  <button
                    data-remove
                    onClick={(e) => { e.stopPropagation(); removeSlot(realIndex) }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-xs leading-none bg-black/20 hover:bg-black/40 rounded cursor-pointer transition"
                  >×</button>
                </div>
              )
            })}

            {/* Overnight selected events — evening block + morning block */}
            {selectedSlots.map((slot, realIndex) => {
              if (!slot.isOvernight) return null
              const timeColWidth = 40
              const blocks = []

              // Drop-off day: block from drop-off time to end of grid
              const colStart = visibleDates.indexOf(slot.date)
              if (colStart >= 0) {
                const [dh, dm] = slot.time.split(':').map(Number)
                const dropMin = dh * 60 + dm
                const topPx = ((dropMin - startHour * 60) / 60) * PX_PER_HOUR
                const bottomPx = hours.length * PX_PER_HOUR
                blocks.push(
                  <div
                    key={`on-drop-${realIndex}`}
                    className="absolute rounded-t bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group hover:bg-purple-700 transition-colors"
                    style={{
                      top: `${topPx}px`, height: `${bottomPx - topPx}px`,
                      left: `calc(${timeColWidth}px + ${colStart} * ((100% - ${timeColWidth}px) / ${gridCols}) + 1px)`,
                      width: `calc((100% - ${timeColWidth}px) / ${gridCols} - 3px)`, zIndex: 20,
                    }}
                  >
                    <span className="truncate leading-tight">Drop-off {slot.time} · {slot.nights}n · £{(slot.priceCents / 100).toFixed(0)}</span>
                    <button
                      data-remove
                      onClick={(e) => { e.stopPropagation(); removeSlot(realIndex) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-xs leading-none bg-black/20 hover:bg-black/40 rounded cursor-pointer transition"
                    >×</button>
                  </div>
                )
              }

              // Pick-up day: block from start of grid to pick-up time
              const colEnd = visibleDates.indexOf(slot.endDate)
              if (colEnd >= 0) {
                const [ph, pm] = slot.endTime.split(':').map(Number)
                const pickMin = ph * 60 + pm
                const heightPx = ((pickMin - startHour * 60) / 60) * PX_PER_HOUR
                if (heightPx > 0) {
                  blocks.push(
                    <div
                      key={`on-pick-${realIndex}`}
                      className="absolute rounded-b bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-end justify-between hover:bg-purple-700 transition-colors group"
                      style={{
                        top: 0, height: `${heightPx}px`,
                        left: `calc(${timeColWidth}px + ${colEnd} * ((100% - ${timeColWidth}px) / ${gridCols}) + 1px)`,
                        width: `calc((100% - ${timeColWidth}px) / ${gridCols} - 3px)`, zIndex: 20,
                      }}
                    >
                      <span className="truncate leading-tight">Pick-up {slot.endTime}</span>
                      <button
                        data-remove
                        onClick={(e) => { e.stopPropagation(); removeSlot(realIndex) }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-xs leading-none bg-black/20 hover:bg-black/40 rounded cursor-pointer transition"
                      >×</button>
                    </div>
                  )
                }
              }

              // Full-day blocks for days in between
              for (let di = 0; di < visibleDates.length; di++) {
                const d = visibleDates[di]
                if (d > slot.date && d < slot.endDate) {
                  blocks.push(
                    <div
                      key={`on-mid-${realIndex}-${di}`}
                      className="absolute bg-purple-600/20 pointer-events-none"
                      style={{
                        top: 0, height: `${hours.length * PX_PER_HOUR}px`,
                        left: `calc(${timeColWidth}px + ${di} * ((100% - ${timeColWidth}px) / ${gridCols}))`,
                        width: `calc((100% - ${timeColWidth}px) / ${gridCols})`, zIndex: 15,
                      }}
                    />
                  )
                }
              }

              return blocks
            })}

            {/* Drag ghost */}
            {dragging?.moved && dragCell && (() => {
              const slot = selectedSlots[dragging.index]
              if (!slot) return null
              const colIndex = visibleDates.indexOf(dragCell.date)
              if (colIndex < 0) return null
              const timeColWidth = 40
              const colLeft = `calc(${timeColWidth}px + ${colIndex} * ((100% - ${timeColWidth}px) / ${gridCols}) + 1px)`
              const colW = `calc((100% - ${timeColWidth}px) / ${gridCols} - 3px)`

              if (slot.isOvernight) {
                const dropTopPx = ((OVERNIGHT_DROP - startHour * 60) / 60) * PX_PER_HOUR
                const dropHeightPx = hours.length * PX_PER_HOUR - dropTopPx
                return (
                  <div className="absolute rounded bg-purple-500/60 border-2 border-purple-400 border-dashed text-white px-1.5 py-0.5 text-[10px] pointer-events-none"
                    style={{ top: `${dropTopPx}px`, height: `${dropHeightPx}px`, left: colLeft, width: colW, zIndex: 30 }}>
                    {slot.serviceName} · {timeStr(OVERNIGHT_DROP)}
                  </div>
                )
              }

              const topPx = ((dragCell.minutes - startHour * 60) / 60) * PX_PER_HOUR
              const heightPx = (slot.durationMinutes / 60) * PX_PER_HOUR
              return (
                <div className="absolute rounded bg-indigo-500/60 border-2 border-indigo-400 border-dashed text-white px-1.5 py-0.5 text-[10px] pointer-events-none"
                  style={{ top: `${topPx}px`, height: `${Math.max(heightPx, 20)}px`, left: colLeft, width: colW, zIndex: 30 }}>
                  {timeStr(dragCell.minutes)} {slot.serviceName}
                </div>
              )
            })()}

          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {isOvernight && selectedSlots.length === 0
            ? 'Click a day to book an overnight stay'
            : selectedSlots.length > 0
            ? `${selectedSlots.length} booking${selectedSlots.length > 1 ? 's' : ''} · £${(selectedSlots.reduce((s, sl) => s + sl.priceCents, 0) / 100).toFixed(2)}`
            : 'Click the calendar to book a slot'}
        </span>
        <button
          onClick={handleBookNow}
          disabled={selectedSlots.length === 0}
          className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Book Now{selectedSlots.length > 0 ? ` (${selectedSlots.length})` : ''} →
        </button>
      </div>
    </div>
  )
}
