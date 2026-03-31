import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clientPriceCents } from '../lib/utils'

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d)
    date.setDate(d.getDate() + i)
    return date.toISOString().split('T')[0]
  })
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function timeStr(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function parseTime(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function nextDate(d) { const x = new Date(d); x.setDate(x.getDate() + 1); return x.toISOString().split('T')[0] }

// --- Positioned block on the time grid ---
const TIME_COL = 40
const PX_PER_HOUR = 48

function colCSS(colIndex, gridCols, inset = 1) {
  return {
    left: `calc(${TIME_COL}px + ${colIndex} * ((100% - ${TIME_COL}px) / ${gridCols}) + ${inset}px)`,
    width: `calc((100% - ${TIME_COL}px) / ${gridCols} - ${inset + 1}px)`,
  }
}

function topHeight(startMin, durationMin, startHour) {
  return {
    top: `${((startMin - startHour * 60) / 60) * PX_PER_HOUR}px`,
    height: `${Math.max((durationMin / 60) * PX_PER_HOUR, 20)}px`,
  }
}

function RemoveBtn({ onClick }) {
  return (
    <button
      data-remove
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-xs leading-none bg-black/20 hover:bg-black/40 rounded cursor-pointer transition"
    >×</button>
  )
}

// --- Main component ---
export default function AvailabilityCalendar({ services, walkerId, initialServiceId }) {
  const walkerServices = services || []
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedService, setSelectedService] = useState(initialServiceId || '')
  const slotsKey = `osds_selectedSlots_${walkerId}`
  const [selectedSlots, setSelectedSlots] = useState(() => {
    try {
      const saved = sessionStorage.getItem(slotsKey)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  // weekSlots and fullTimeGrid are derived via useMemo below
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [mobileOffset, setMobileOffset] = useState(0)
  const [hoverCell, setHoverCell] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragCell, setDragCell] = useState(null)
  const gridRef = useRef(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (initialServiceId && initialServiceId !== selectedService) setSelectedService(initialServiceId)
  }, [initialServiceId])

  // Persist selections so navigating back restores them
  useEffect(() => {
    sessionStorage.setItem(slotsKey, JSON.stringify(selectedSlots))
  }, [selectedSlots])

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const service = walkerServices.find((s) => s.id === selectedService)
  const duration = service?.duration_minutes || 30
  const isOvernight = service?.service_type === 'overnight'

  const DROP_MIN = 18 * 60
  const PICK_MIN = 10 * 60

  // --- Pre-fetch 28 days of availability ---
  const [allSlotData, setAllSlotData] = useState({}) // { [date]: { slots, allSlots } }
  const [fetchedRange, setFetchedRange] = useState(null) // { start, end }

  const fetchRange = useCallback(async (startDate, endDate, signal) => {
    const params = new URLSearchParams({
      walker_id: walkerId,
      start_date: startDate,
      end_date: endDate,
      duration_minutes: String(duration),
      service_type: service?.service_type || 'standard',
    })
    try {
      const res = await fetch(`/.netlify/functions/get-availability?${params}`, { signal })
      const json = await res.json()
      return json.data || {}
    } catch {
      return {}
    }
  }, [walkerId, duration, service?.service_type])

  // Fetch 28 days on mount and when service changes
  useEffect(() => {
    if (!walkerId) return
    const controller = new AbortController()
    setLoadingSlots(true)

    const start = new Date()
    const end = new Date()
    end.setDate(start.getDate() + 27)
    const startStr = toDateStr(start)
    const endStr = toDateStr(end)

    fetchRange(startStr, endStr, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      setAllSlotData(data)
      setFetchedRange({ start: startStr, end: endStr })
      setLoadingSlots(false)
    })
    return () => controller.abort()
  }, [walkerId, fetchRange])

  // If the user navigates beyond the pre-fetched range, fetch more
  useEffect(() => {
    if (!walkerId || !fetchedRange) return
    const needsStart = weekDates[0]
    const needsEnd = weekDates[6]
    if (needsStart >= fetchedRange.start && needsEnd <= fetchedRange.end) return

    const controller = new AbortController()
    setLoadingSlots(true)

    // Fetch a new 28-day window starting from the current week
    const end = new Date(needsStart + 'T00:00:00')
    end.setDate(end.getDate() + 27)
    const endStr = toDateStr(end)

    fetchRange(needsStart, endStr, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      setAllSlotData((prev) => ({ ...prev, ...data }))
      setFetchedRange((prev) => ({
        start: needsStart < prev.start ? needsStart : prev.start,
        end: endStr > prev.end ? endStr : prev.end,
      }))
      setLoadingSlots(false)
    })
    return () => controller.abort()
  }, [walkerId, weekDates[0], weekDates[6], fetchedRange, fetchRange])

  // Derive weekSlots and fullTimeGrid synchronously from pre-fetched data
  const { weekSlots, fullTimeGrid } = useMemo(() => {
    const slotMap = {}
    const times = new Set()
    for (const date of weekDates) {
      const day = allSlotData[date]
      slotMap[date] = day?.slots || []
      const allTimes = day?.allSlots || day?.slots || []
      allTimes.forEach((t) => times.add(t))
    }
    return { weekSlots: slotMap, fullTimeGrid: Array.from(times).sort() }
  }, [weekDates.join(','), allSlotData])

  // --- Derived values ---
  const baseStartH = fullTimeGrid.length > 0 ? Math.max(7, parseInt(fullTimeGrid[0])) : 7
  const baseEndH = fullTimeGrid.length > 0 ? Math.min(20, parseInt(fullTimeGrid[fullTimeGrid.length - 1]) + 1) : 19
  const hasOvernight = isOvernight || selectedSlots.some((s) => s.isOvernight)
  const startHour = hasOvernight ? Math.min(baseStartH, PICK_MIN / 60) : baseStartH
  const endHour = hasOvernight ? Math.max(baseEndH, DROP_MIN / 60 + 1) : baseEndH
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour)
  const visibleDates = isMobile ? weekDates.slice(mobileOffset, mobileOffset + 3) : weekDates
  const gridCols = visibleDates.length

  // --- Availability checks ---
  function slotAvailable(date, time) {
    const slots = weekSlots[date]
    if (!slots?.includes(time)) return false
    if (isOvernight) return true
    const needed = Math.ceil(duration / 30)
    if (needed <= 1) return true
    const start = parseTime(time)
    for (let i = 1; i < needed; i++) if (!slots.includes(timeStr(start + i * 30))) return false
    return true
  }

  function blockedBySelection(date, min) {
    return selectedSlots.some((s) => {
      if (s.isOvernight) {
        if (date === s.date) return min >= parseTime(s.time)
        if (date === s.endDate) return min < parseTime(s.endTime)
        return date > s.date && date < s.endDate
      }
      if (s.date !== date) return false
      const start = parseTime(s.time)
      return min >= start && min < start + s.durationMinutes
    })
  }

  function overnightBlocked(date) {
    const nd = nextDate(date)
    // Check evening of drop-off day and morning of pick-up day for selection conflicts
    for (let m = DROP_MIN; m < endHour * 60; m += 30) if (blockedBySelection(date, m)) return true
    for (let m = startHour * 60; m < PICK_MIN; m += 30) if (blockedBySelection(nd, m)) return true
    // Check server-side: morning slots booked on pick-up day
    const pickSlots = weekSlots[nd] || []
    for (let m = startHour * 60; m < PICK_MIN; m += 30) {
      if (pickSlots.length > 0 && !pickSlots.includes(timeStr(m)) && m >= baseStartH * 60) return true
    }
    // Duplicate overnight check
    return selectedSlots.some((s) => s.isOvernight && (s.date === date || s.date === nd || s.endDate === date))
  }

  // --- Resolve screen coords to a grid cell ---
  function resolveCell(cx, cy) {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const colIdx = Math.floor((cx - rect.left - TIME_COL) / ((rect.width - TIME_COL) / gridCols))
    if (colIdx < 0 || colIdx >= gridCols) return null
    const date = visibleDates[colIdx]
    if (!date || date < todayStr) return null
    if (isOvernight) return overnightBlocked(date) ? null : { date, minutes: DROP_MIN }
    const min = Math.floor((startHour * 60 + ((cy - rect.top) / PX_PER_HOUR) * 60) / 30) * 30
    const t = timeStr(min)
    return slotAvailable(date, t) && !blockedBySelection(date, min) ? { date, minutes: min } : null
  }

  // --- Build a slot object ---
  function makeSlot(date, minutes) {
    const svc = service || walkerServices[0]
    if (!svc) return null
    if (svc.service_type === 'overnight') {
      return {
        date, time: timeStr(DROP_MIN), endDate: nextDate(date), endTime: timeStr(PICK_MIN),
        serviceId: svc.id, serviceName: svc.name, priceCents: clientPriceCents(svc.price_cents),
        durationMinutes: svc.duration_minutes, isOvernight: true, nights: 1,
      }
    }
    return {
      date, time: timeStr(minutes), endTime: timeStr(minutes + svc.duration_minutes),
      endDate: date, serviceId: svc.id, serviceName: svc.name,
      priceCents: clientPriceCents(svc.price_cents), durationMinutes: svc.duration_minutes,
      isOvernight: false, nights: 0,
    }
  }

  function isDuplicate(date, time) {
    return selectedSlots.some((s) => s.date === date && s.time === time)
  }

  function addSlot(cell) {
    if (!cell) return
    const t = timeStr(cell.minutes)
    if (isOvernight ? overnightBlocked(cell.date) : isDuplicate(cell.date, t)) return
    const slot = makeSlot(cell.date, cell.minutes)
    if (slot) setSelectedSlots((prev) => [...prev, slot])
  }

  function removeSlot(i) { setSelectedSlots((prev) => prev.filter((_, idx) => idx !== i)) }

  // --- Event handlers ---
  function handleMouseMove(e) { if (!dragging) setHoverCell(resolveCell(e.clientX, e.clientY)) }
  function handleClick() { if (!dragging) addSlot(hoverCell) }
  function handleTouchEnd(e) {
    if (!e.changedTouches.length) return
    const t = e.changedTouches[0]
    addSlot(resolveCell(t.clientX, t.clientY))
    e.preventDefault()
  }

  // --- Drag to move (standard events only) ---
  const DRAG_PX = 5

  function startDrag(index, cx, cy, e) {
    e.stopPropagation(); e.preventDefault()
    setDragging({ index, startX: cx, startY: cy, moved: false })
    setDragCell(null)
  }

  useEffect(() => {
    if (!dragging) return
    function move(cx, cy) {
      const dx = cx - dragging.startX, dy = cy - dragging.startY
      if (!dragging.moved && Math.abs(dx) < DRAG_PX && Math.abs(dy) < DRAG_PX) return
      if (!dragging.moved) setDragging((d) => ({ ...d, moved: true }))
      setDragCell(resolveCell(cx, cy))
    }
    function end() {
      if (dragging.moved && dragCell) {
        setSelectedSlots((prev) => prev.map((s, i) => {
          if (i !== dragging.index) return s
          const endMin = dragCell.minutes + s.durationMinutes
          return { ...s, date: dragCell.date, time: timeStr(dragCell.minutes), endTime: timeStr(endMin), endDate: dragCell.date }
        }))
      } else if (!dragging.moved) removeSlot(dragging.index)
      setDragging(null); setDragCell(null)
    }
    const mm = (e) => move(e.clientX, e.clientY)
    const tm = (e) => e.touches.length && move(e.touches[0].clientX, e.touches[0].clientY)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', tm, { passive: true })
    window.addEventListener('touchend', end)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', end); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', end) }
  }, [dragging, dragCell])

  function handleBookNow() {
    // Always go to review page — it handles login prompt at submit time
    localStorage.setItem('osds_bookingIntent', JSON.stringify({ walkerSlug: walkerParam || null, walkerId, slots: selectedSlots, savedAt: Date.now() }))
    navigate(`${prefix}/book`, { state: { slots: selectedSlots, walkerId } })
  }

  // --- Render helpers ---
  function renderUnavailBlocks() {
    return visibleDates.map((date, ci) => {
      const ranges = []
      for (let m = startHour * 60; m < endHour * 60; m += 30) {
        if (date < todayStr || !slotAvailable(date, timeStr(m))) {
          const last = ranges[ranges.length - 1]
          if (last?.end === m) last.end = m + 30
          else ranges.push({ start: m, end: m + 30 })
        }
      }
      return ranges.map((r, i) => (
        <div key={`u-${date}-${i}`} className="absolute bg-gray-100/80 pointer-events-none"
          style={{ ...topHeight(r.start, r.end - r.start, startHour), ...colCSS(ci, gridCols, 0) }} />
      ))
    })
  }

  function renderHoverGhost() {
    if (!hoverCell) return null
    const ci = visibleDates.indexOf(hoverCell.date)
    if (ci < 0) return null
    const css = colCSS(ci, gridCols, 0)
    const ghost = 'absolute pointer-events-none rounded border border-dashed px-1.5 py-0.5 text-[10px] overflow-hidden'

    if (isOvernight) {
      const dropTop = ((DROP_MIN - startHour * 60) / 60) * PX_PER_HOUR
      const blocks = [
        <div key="gh-d" className={`${ghost} bg-purple-400/30 border-purple-400/50 text-purple-700 rounded-t`}
          style={{ top: `${dropTop}px`, height: `${hours.length * PX_PER_HOUR - dropTop}px`, ...css }}>
          Drop-off {timeStr(DROP_MIN)}
        </div>,
      ]
      const nci = visibleDates.indexOf(nextDate(hoverCell.date))
      if (nci >= 0) {
        const pickH = ((PICK_MIN - startHour * 60) / 60) * PX_PER_HOUR
        blocks.push(
          <div key="gh-p" className={`${ghost} bg-purple-400/30 border-purple-400/50 text-purple-700 rounded-b flex items-end pb-0.5`}
            style={{ top: 0, height: `${pickH}px`, ...colCSS(nci, gridCols, 0) }}>
            Pick-up {timeStr(PICK_MIN)}
          </div>
        )
      }
      return blocks
    }
    return (
      <div className={`${ghost} bg-indigo-400/30 border-indigo-400/50 text-indigo-700`}
        style={{ ...topHeight(hoverCell.minutes, duration, startHour), ...css }}>
        {timeStr(hoverCell.minutes)} {service?.name || 'Book'}
      </div>
    )
  }

  function renderStandardEvents() {
    return selectedSlots.map((slot, i) => {
      if (slot.isOvernight || (dragging?.index === i && dragging.moved)) return null
      const ci = visibleDates.indexOf(slot.date)
      if (ci < 0) return null
      return (
        <div key={i}
          onMouseDown={(e) => { if (!e.target.closest('[data-remove]')) startDrag(i, e.clientX, e.clientY, e) }}
          onTouchStart={(e) => { if (!e.target.closest('[data-remove]') && e.touches.length) startDrag(i, e.touches[0].clientX, e.touches[0].clientY, e) }}
          className="absolute rounded bg-indigo-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group cursor-grab active:cursor-grabbing hover:bg-indigo-700 transition-colors"
          style={{ ...topHeight(parseTime(slot.time), slot.durationMinutes, startHour), ...colCSS(ci, gridCols), zIndex: 20 }}>
          <span className="truncate leading-tight">{slot.time} {slot.serviceName}</span>
          <RemoveBtn onClick={() => removeSlot(i)} />
        </div>
      )
    })
  }

  function renderOvernightEvents() {
    return selectedSlots.map((slot, i) => {
      if (!slot.isOvernight) return null
      const blocks = []
      // Drop-off block
      const ci = visibleDates.indexOf(slot.date)
      if (ci >= 0) {
        const dropMin = parseTime(slot.time)
        const h = hours.length * PX_PER_HOUR - ((dropMin - startHour * 60) / 60) * PX_PER_HOUR
        blocks.push(
          <div key={`od-${i}`} className="absolute rounded-t bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group hover:bg-purple-700 transition-colors"
            style={{ top: `${((dropMin - startHour * 60) / 60) * PX_PER_HOUR}px`, height: `${h}px`, ...colCSS(ci, gridCols), zIndex: 20 }}>
            <span className="truncate leading-tight">Drop-off {slot.time} · {slot.nights}n · £{(slot.priceCents / 100).toFixed(0)}</span>
            <RemoveBtn onClick={() => removeSlot(i)} />
          </div>
        )
      }
      // Pick-up block
      const ei = visibleDates.indexOf(slot.endDate)
      if (ei >= 0) {
        const pickH = ((parseTime(slot.endTime) - startHour * 60) / 60) * PX_PER_HOUR
        if (pickH > 0) {
          blocks.push(
            <div key={`op-${i}`} className="absolute rounded-b bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-end justify-between hover:bg-purple-700 transition-colors group"
              style={{ top: 0, height: `${pickH}px`, ...colCSS(ei, gridCols), zIndex: 20 }}>
              <span className="truncate leading-tight">Pick-up {slot.endTime}</span>
              <RemoveBtn onClick={() => removeSlot(i)} />
            </div>
          )
        }
      }
      // Mid-day blocks
      visibleDates.forEach((d, di) => {
        if (d > slot.date && d < slot.endDate) {
          blocks.push(
            <div key={`om-${i}-${di}`} className="absolute bg-purple-600/20 pointer-events-none"
              style={{ top: 0, height: `${hours.length * PX_PER_HOUR}px`, ...colCSS(di, gridCols, 0), zIndex: 15 }} />
          )
        }
      })
      return blocks
    })
  }

  function renderDragGhost() {
    if (!dragging?.moved || !dragCell) return null
    const slot = selectedSlots[dragging.index]
    if (!slot) return null
    const ci = visibleDates.indexOf(dragCell.date)
    if (ci < 0) return null
    return (
      <div className="absolute rounded bg-indigo-500/60 border-2 border-indigo-400 border-dashed text-white px-1.5 py-0.5 text-[10px] pointer-events-none"
        style={{ ...topHeight(dragCell.minutes, slot.durationMinutes, startHour), ...colCSS(ci, gridCols), zIndex: 30 }}>
        {timeStr(dragCell.minutes)} {slot.serviceName}
      </div>
    )
  }

  // --- Render ---
  return (
    <div>
      {!initialServiceId && (
        <div className="mb-3">
          <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-full sm:w-auto focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
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
        <button onClick={() => { setWeekOffset((w) => w - 1); setMobileOffset(0) }} disabled={weekOffset === 0} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-xs font-medium">← Prev</button>
        <span className="text-xs font-medium text-gray-700">
          {new Date(weekDates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(weekDates[6]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => { setWeekOffset((w) => w + 1); setMobileOffset(0) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-xs font-medium">Next →</button>
      </div>

      {isMobile && (
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setMobileOffset((o) => Math.max(0, o - 1))} disabled={mobileOffset === 0} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1">← Earlier</button>
          <button onClick={() => setMobileOffset((o) => Math.min(4, o + 1))} disabled={mobileOffset >= 4} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1">Later →</button>
        </div>
      )}

      {/* Time grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `2.5rem repeat(${gridCols}, 1fr)` }}>
          <div />
          {visibleDates.map((date) => {
            const d = new Date(date)
            return (
              <div key={date} className={`text-center py-1.5 text-xs border-l border-gray-100 ${date === todayStr ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                <div className="text-sm font-bold">{d.getDate()}</div>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div ref={gridRef} className="relative cursor-pointer select-none"
          style={{ height: `${Math.max(hours.length, 10) * PX_PER_HOUR}px` }}
          onMouseMove={!loadingSlots ? handleMouseMove : undefined}
          onMouseLeave={() => setHoverCell(null)}
          onClick={!loadingSlots ? handleClick : undefined}
          onTouchEnd={!loadingSlots ? handleTouchEnd : undefined}>

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
                {visibleDates.map((date) => (
                  <div key={`${date}-${hour}`} className={`border-l border-gray-100 ${date < todayStr ? 'bg-gray-50' : ''}`} />
                ))}
              </div>
            </div>
          ))}

          {renderUnavailBlocks()}
          {renderHoverGhost()}
          {renderStandardEvents()}
          {renderOvernightEvents()}
          {renderDragGhost()}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {selectedSlots.length > 0
            ? `${selectedSlots.length} booking${selectedSlots.length > 1 ? 's' : ''} · £${(selectedSlots.reduce((s, sl) => s + sl.priceCents, 0) / 100).toFixed(2)}`
            : isOvernight ? 'Click a day to book an overnight stay' : 'Click the calendar to book a slot'}
        </span>
        <button onClick={handleBookNow} disabled={selectedSlots.length === 0}
          className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
          Book Now{selectedSlots.length > 0 ? ` (${selectedSlots.length})` : ''} →
        </button>
      </div>
    </div>
  )
}
