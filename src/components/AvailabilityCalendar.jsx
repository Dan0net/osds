import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'
import { clientPriceCents } from '../lib/utils'
import Modal from './Modal'

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDateStr(d) {
  return localDateStr(d)
}

function shiftDate(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

function nextDate(dateStr) {
  return shiftDate(dateStr, 1)
}

function getWeekDates(baseDate) {
  const startStr = localDateStr(baseDate)
  return Array.from({ length: 7 }, (_, i) => shiftDate(startStr, i))
}

function timeStr(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function parseTime(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function paneDatesFromAnchor(anchorStr, count = 3) {
  return Array.from({ length: count }, (_, i) => shiftDate(anchorStr, i))
}

// --- Positioned block on the time grid ---
const TIME_COL = 40
const PX_PER_HOUR_DESKTOP = 48
const PX_PER_HOUR_MOBILE = 64
const TOP_PAD = 10
const MOBILE_PANE_DAYS = 3
const MOBILE_GRID_MAX_HEIGHT = 'calc(100dvh - 220px)'

function colCSS(colIndex, gridCols, inset = 1) {
  return {
    left: `calc(${TIME_COL}px + ${colIndex} * ((100% - ${TIME_COL}px) / ${gridCols}) + ${inset}px)`,
    width: `calc((100% - ${TIME_COL}px) / ${gridCols} - ${inset + 1}px)`,
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
export default function AvailabilityCalendar({ services, walkerId, initialServiceId, value, onChange, hideFooter = false }) {
  const walkerServices = services || []
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedService, setSelectedService] = useState(initialServiceId || '')
  const isControlled = value !== undefined && typeof onChange === 'function'
  const slotsKey = `osds_selectedSlots_${walkerId}`
  const [internalSlots, setInternalSlots] = useState(() => {
    if (isControlled) return []
    try {
      const saved = sessionStorage.getItem(slotsKey)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const selectedSlots = isControlled ? value : internalSlots
  const setSelectedSlots = useCallback((updater) => {
    if (isControlled) {
      const next = typeof updater === 'function' ? updater(value) : updater
      onChange(next)
    } else {
      setInternalSlots(updater)
    }
  }, [isControlled, value, onChange])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [hoverCell, setHoverCell] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragCell, setDragCell] = useState(null)
  const gridRef = useRef(null)
  const wrapperRef = useRef(null)
  const trackRef = useRef(null)
  const atMobileStartRef = useRef(false)

  const today = new Date()
  const todayStr = localDateStr(today)

  // Mobile pane state — prev/next arrows step the 3-day window.
  const [mobileAnchor, setMobileAnchor] = useState(todayStr)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (initialServiceId && initialServiceId !== selectedService) setSelectedService(initialServiceId)
  }, [initialServiceId])

  // Persist selections so navigating back restores them (uncontrolled mode only)
  useEffect(() => {
    if (isControlled) return
    sessionStorage.setItem(slotsKey, JSON.stringify(selectedSlots))
  }, [selectedSlots, isControlled])

  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)

  const PX_PER_HOUR = isMobile ? PX_PER_HOUR_MOBILE : PX_PER_HOUR_DESKTOP
  const topHeight = useCallback((startMin, durationMin, startHour) => ({
    top: `${TOP_PAD + ((startMin - startHour * 60) / 60) * PX_PER_HOUR}px`,
    height: `${Math.max((durationMin / 60) * PX_PER_HOUR, 20)}px`,
  }), [PX_PER_HOUR])

  const service = walkerServices.find((s) => s.id === selectedService)
  const duration = service?.duration_minutes || 30
  const isOvernight = service?.service_type === 'overnight'
  const [serviceModalOpen, setServiceModalOpen] = useState(false)

  const DROP_MIN = 18 * 60
  const PICK_MIN = 10 * 60

  const currentPaneDates = paneDatesFromAnchor(mobileAnchor, MOBILE_PANE_DAYS)
  const prevPaneDates = paneDatesFromAnchor(shiftDate(mobileAnchor, -MOBILE_PANE_DAYS), MOBILE_PANE_DAYS)
  const nextPaneDates = paneDatesFromAnchor(shiftDate(mobileAnchor, MOBILE_PANE_DAYS), MOBILE_PANE_DAYS)
  const atMobileStart = mobileAnchor <= todayStr

  const visibleDates = isMobile ? currentPaneDates : weekDates

  // --- Pre-fetch availability ---
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

  // Visible range — used to trigger refetch when the user navigates out of the prefetched window
  const visStart = isMobile ? currentPaneDates[0] : weekDates[0]
  const visEnd = isMobile ? currentPaneDates[MOBILE_PANE_DAYS - 1] : weekDates[6]

  useEffect(() => {
    if (!walkerId || !fetchedRange) return
    if (visStart >= fetchedRange.start && visEnd <= fetchedRange.end) return

    const controller = new AbortController()
    setLoadingSlots(true)

    const startStr = visStart
    const end = new Date(startStr + 'T00:00:00')
    end.setDate(end.getDate() + 27)
    const endStr = toDateStr(end)

    fetchRange(startStr, endStr, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      setAllSlotData((prev) => ({ ...prev, ...data }))
      setFetchedRange((prev) => ({
        start: startStr < prev.start ? startStr : prev.start,
        end: endStr > prev.end ? endStr : prev.end,
      }))
      setLoadingSlots(false)
    })
    return () => controller.abort()
  }, [walkerId, visStart, visEnd, fetchedRange, fetchRange])

  // Derive weekSlots and fullTimeGrid synchronously
  const { weekSlots, fullTimeGrid } = useMemo(() => {
    const slotMap = {}
    const times = new Set()
    const relevant = isMobile
      ? [...prevPaneDates, ...currentPaneDates, ...nextPaneDates]
      : weekDates
    for (const date of relevant) {
      const day = allSlotData[date]
      slotMap[date] = day?.slots || []
      const allTimes = day?.allSlots || day?.slots || []
      allTimes.forEach((t) => times.add(t))
    }
    return { weekSlots: slotMap, fullTimeGrid: Array.from(times).sort() }
  }, [isMobile, weekDates.join(','), prevPaneDates.join(','), currentPaneDates.join(','), nextPaneDates.join(','), allSlotData])

  // --- Derived values ---
  const baseStartH = fullTimeGrid.length > 0 ? Math.max(7, parseInt(fullTimeGrid[0])) : 7
  const baseEndH = fullTimeGrid.length > 0 ? Math.min(20, parseInt(fullTimeGrid[fullTimeGrid.length - 1]) + 1) : 19
  const hasOvernight = isOvernight || selectedSlots.some((s) => s.isOvernight)
  const startHour = hasOvernight ? Math.min(baseStartH, PICK_MIN / 60) : baseStartH
  const endHour = hasOvernight ? Math.max(baseEndH, DROP_MIN / 60 + 1) : baseEndH
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour)
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
    for (let m = DROP_MIN; m < endHour * 60; m += 30) if (blockedBySelection(date, m)) return true
    for (let m = startHour * 60; m < PICK_MIN; m += 30) if (blockedBySelection(nd, m)) return true
    const pickSlots = weekSlots[nd] || []
    for (let m = startHour * 60; m < PICK_MIN; m += 30) {
      if (pickSlots.length > 0 && !pickSlots.includes(timeStr(m)) && m >= baseStartH * 60) return true
    }
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
    const min = Math.floor((startHour * 60 + ((cy - rect.top - TOP_PAD) / PX_PER_HOUR) * 60) / 30) * 30
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
  function handleClick(e) {
    if (dragging) return
    // Browser suppresses click after a swipe/drag, so this only fires on a real tap.
    const cell = hoverCell || resolveCell(e.clientX, e.clientY)
    addSlot(cell)
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

  useEffect(() => { atMobileStartRef.current = atMobileStart }, [atMobileStart])

  useEffect(() => {
    if (!isMobile) return
    const wrapper = wrapperRef.current
    const track = trackRef.current
    if (!wrapper || !track) return

    let phase = 'idle'
    let bailed = false
    let startX = 0
    let startY = 0
    let startTime = 0
    let lastDx = 0
    let width = 0
    let rafId = null

    function setTransform(value, transition = 'none') {
      track.style.transition = transition
      track.style.transform = `translateX(${value})`
    }

    function onStart(e) {
      bailed = false
      if (e.touches.length !== 1) { bailed = true; return }
      if (e.target.closest('[data-event],[data-remove]')) { bailed = true; return }
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      startTime = Date.now()
      lastDx = 0
      width = wrapper.clientWidth
      phase = 'idle'
    }

    function onMove(e) {
      if (bailed || phase === 'vscroll' || !e.touches.length) return
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      if (phase === 'idle') {
        const adx = Math.abs(dx), ady = Math.abs(dy)
        if (adx < 8 && ady < 8) return
        if (ady > adx) { phase = 'vscroll'; return }
        phase = 'hswipe'
      }

      if (phase === 'hswipe') {
        e.preventDefault()
        let clamped = dx
        if (atMobileStartRef.current && dx > 0) clamped = dx * 0.3
        lastDx = clamped
        if (rafId) return
        rafId = requestAnimationFrame(() => {
          rafId = null
          setTransform(`calc(-33.333% + ${lastDx}px)`)
        })
      }
    }

    function onEnd() {
      if (bailed) { bailed = false; return }
      if (phase !== 'hswipe') { phase = 'idle'; return }
      if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      const dx = lastDx
      const elapsed = Date.now() - startTime
      const velocity = elapsed > 0 ? dx / elapsed : 0
      const threshold = width * 0.18

      let dir = 0
      if (dx > threshold || velocity > 0.4) dir = -1
      else if (dx < -threshold || velocity < -0.4) dir = 1
      if (atMobileStartRef.current && dir === -1) dir = 0

      const target = dir === -1 ? '0%' : dir === 1 ? '-66.667%' : '-33.333%'
      setTransform(target, 'transform 220ms cubic-bezier(0.2, 0, 0, 1)')

      let done = false
      const finish = () => {
        if (done) return
        done = true
        track.removeEventListener('transitionend', finish)
        clearTimeout(fallbackId)
        if (dir !== 0) {
          flushSync(() => {
            setMobileAnchor((a) => {
              const candidate = shiftDate(a, dir * MOBILE_PANE_DAYS)
              return dir === -1 && candidate < todayStr ? todayStr : candidate
            })
          })
        }
        setTransform('-33.333%')
        phase = 'idle'
      }
      track.addEventListener('transitionend', finish)
      const fallbackId = setTimeout(finish, 300)
    }

    wrapper.addEventListener('touchstart', onStart, { passive: true })
    wrapper.addEventListener('touchmove', onMove, { passive: false })
    wrapper.addEventListener('touchend', onEnd, { passive: true })
    wrapper.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      wrapper.removeEventListener('touchstart', onStart)
      wrapper.removeEventListener('touchmove', onMove)
      wrapper.removeEventListener('touchend', onEnd)
      wrapper.removeEventListener('touchcancel', onEnd)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isMobile])

  function handleBookNow() {
    localStorage.setItem('osds_bookingIntent', JSON.stringify({ walkerSlug: walkerParam || null, walkerId, slots: selectedSlots, savedAt: Date.now() }))
    navigate(`${prefix}/book`, { state: { slots: selectedSlots, walkerId } })
  }

  // --- Render helpers (parametrized by pane dates) ---
  function renderUnavailBlocks(paneDates) {
    const paneCols = paneDates.length
    return paneDates.map((date, ci) => {
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
          style={{ ...topHeight(r.start, r.end - r.start, startHour), ...colCSS(ci, paneCols, 0) }} />
      ))
    })
  }

  function renderHoverGhost(paneDates) {
    if (!hoverCell) return null
    const paneCols = paneDates.length
    const ci = paneDates.indexOf(hoverCell.date)
    if (ci < 0) return null
    const css = colCSS(ci, paneCols, 0)
    const ghost = 'absolute pointer-events-none rounded border border-dashed px-1.5 py-0.5 text-[10px] overflow-hidden'

    if (isOvernight) {
      const dropTop = ((DROP_MIN - startHour * 60) / 60) * PX_PER_HOUR
      const blocks = [
        <div key="gh-d" className={`${ghost} bg-purple-400/30 border-purple-400/50 text-purple-700 rounded-t`}
          style={{ top: `${TOP_PAD + dropTop}px`, height: `${hours.length * PX_PER_HOUR - dropTop}px`, ...css }}>
          Drop-off {timeStr(DROP_MIN)}
        </div>,
      ]
      const nci = paneDates.indexOf(nextDate(hoverCell.date))
      if (nci >= 0) {
        const pickH = ((PICK_MIN - startHour * 60) / 60) * PX_PER_HOUR
        blocks.push(
          <div key="gh-p" className={`${ghost} bg-purple-400/30 border-purple-400/50 text-purple-700 rounded-b flex items-end pb-0.5`}
            style={{ top: `${TOP_PAD}px`, height: `${pickH}px`, ...colCSS(nci, paneCols, 0) }}>
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

  function renderStandardEvents(paneDates) {
    const paneCols = paneDates.length
    return selectedSlots.map((slot, i) => {
      if (slot.isOvernight || (dragging?.index === i && dragging.moved)) return null
      const ci = paneDates.indexOf(slot.date)
      if (ci < 0) return null
      return (
        <div key={i} data-event
          onMouseDown={(e) => { if (!e.target.closest('[data-remove]')) startDrag(i, e.clientX, e.clientY, e) }}
          onTouchStart={(e) => { if (!e.target.closest('[data-remove]') && e.touches.length) startDrag(i, e.touches[0].clientX, e.touches[0].clientY, e) }}
          className="absolute rounded bg-indigo-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group cursor-grab active:cursor-grabbing hover:bg-indigo-700 transition-colors"
          style={{ ...topHeight(parseTime(slot.time), slot.durationMinutes, startHour), ...colCSS(ci, paneCols), zIndex: 20 }}>
          <span className="truncate leading-tight">{slot.time} {slot.serviceName}</span>
          <RemoveBtn onClick={() => removeSlot(i)} />
        </div>
      )
    })
  }

  function renderOvernightEvents(paneDates) {
    const paneCols = paneDates.length
    return selectedSlots.map((slot, i) => {
      if (!slot.isOvernight) return null
      const blocks = []
      const ci = paneDates.indexOf(slot.date)
      if (ci >= 0) {
        const dropMin = parseTime(slot.time)
        const dropTop = ((dropMin - startHour * 60) / 60) * PX_PER_HOUR
        const h = hours.length * PX_PER_HOUR - dropTop
        blocks.push(
          <div key={`od-${i}`} data-event className="absolute rounded-t bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-start justify-between group hover:bg-purple-700 transition-colors"
            style={{ top: `${TOP_PAD + dropTop}px`, height: `${h}px`, ...colCSS(ci, paneCols), zIndex: 20 }}>
            <span className="truncate leading-tight">Drop-off {slot.time} · {slot.nights}n · £{(slot.priceCents / 100).toFixed(0)}</span>
            <RemoveBtn onClick={() => removeSlot(i)} />
          </div>
        )
      }
      const ei = paneDates.indexOf(slot.endDate)
      if (ei >= 0) {
        const pickH = ((parseTime(slot.endTime) - startHour * 60) / 60) * PX_PER_HOUR
        if (pickH > 0) {
          blocks.push(
            <div key={`op-${i}`} data-event className="absolute rounded-b bg-purple-600 text-white px-1.5 py-0.5 text-[10px] overflow-hidden flex items-end justify-between hover:bg-purple-700 transition-colors group"
              style={{ top: `${TOP_PAD}px`, height: `${pickH}px`, ...colCSS(ei, paneCols), zIndex: 20 }}>
              <span className="truncate leading-tight">Pick-up {slot.endTime}</span>
              <RemoveBtn onClick={() => removeSlot(i)} />
            </div>
          )
        }
      }
      paneDates.forEach((d, di) => {
        if (d > slot.date && d < slot.endDate) {
          blocks.push(
            <div key={`om-${i}-${di}`} className="absolute bg-purple-600/20 pointer-events-none"
              style={{ top: `${TOP_PAD}px`, height: `${hours.length * PX_PER_HOUR}px`, ...colCSS(di, paneCols, 0), zIndex: 15 }} />
          )
        }
      })
      return blocks
    })
  }

  function renderDragGhost(paneDates) {
    if (!dragging?.moved || !dragCell) return null
    const paneCols = paneDates.length
    const slot = selectedSlots[dragging.index]
    if (!slot) return null
    const ci = paneDates.indexOf(dragCell.date)
    if (ci < 0) return null
    return (
      <div className="absolute rounded bg-indigo-500/60 border-2 border-indigo-400 border-dashed text-white px-1.5 py-0.5 text-[10px] pointer-events-none"
        style={{ ...topHeight(dragCell.minutes, slot.durationMinutes, startHour), ...colCSS(ci, paneCols), zIndex: 30 }}>
        {timeStr(dragCell.minutes)} {slot.serviceName}
      </div>
    )
  }

  function DayPane({ dates, paneRef, interactive }) {
    const bodyHeight = hours.length * PX_PER_HOUR + TOP_PAD + 14
    return (
      <div className="bg-white">
        <div
          className="grid border-b border-gray-200 bg-white sticky top-0 z-40"
          style={{ gridTemplateColumns: `${TIME_COL}px repeat(${dates.length}, 1fr)` }}
        >
          <div />
          {dates.map((date) => {
            const d = new Date(date + 'T00:00:00')
            return (
              <div key={date} className={`text-center py-1.5 text-xs border-l border-gray-100 ${date === todayStr ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                <div className="text-sm font-bold">{d.getDate()}</div>
              </div>
            )
          })}
        </div>

        <div
          ref={paneRef}
          className={`relative select-none ${interactive ? 'cursor-pointer' : ''}`}
          style={{ height: `${bodyHeight}px` }}
          onMouseMove={interactive && !loadingSlots ? handleMouseMove : undefined}
          onMouseLeave={interactive ? () => setHoverCell(null) : undefined}
          onClick={interactive && !loadingSlots ? handleClick : undefined}
        >
          {loadingSlots && (
            <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {hours.map((hour, i) => (
            <div key={hour} className="absolute left-0 right-0 flex" style={{ top: `${TOP_PAD + i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}>
              <div style={{ width: `${TIME_COL}px` }} className="shrink-0 text-right pr-1.5 text-[10px] text-gray-400 -mt-1.5">{`${String(hour).padStart(2, '0')}:00`}</div>
              <div className="flex-1 border-t border-gray-100 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}>
                {dates.map((date) => (
                  <div key={`${date}-${hour}`} className={`border-l border-gray-100 ${date < todayStr ? 'bg-gray-50' : ''}`} />
                ))}
              </div>
            </div>
          ))}
          {/* End-of-day label so the last visible time aligns with the body bottom */}
          <div
            className="absolute text-right pr-1.5 text-[10px] text-gray-400 -mt-1.5 shrink-0"
            style={{ width: `${TIME_COL}px`, left: 0, top: `${TOP_PAD + hours.length * PX_PER_HOUR}px` }}
          >
            {`${String(endHour).padStart(2, '0')}:00`}
          </div>

          {renderUnavailBlocks(dates)}
          {interactive && renderHoverGhost(dates)}
          {renderStandardEvents(dates)}
          {renderOvernightEvents(dates)}
          {interactive && renderDragGhost(dates)}
        </div>
      </div>
    )
  }

  // --- Navigation header ---
  const headerAnchor = isMobile ? currentPaneDates[0] : weekDates[0]
  const headerLabel = new Date(headerAnchor + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const selectedServiceObj = walkerServices.find((s) => s.id === selectedService)
  const serviceLabel = selectedServiceObj ? selectedServiceObj.name : 'All services'
  const serviceSubLabel = selectedServiceObj
    ? `${selectedServiceObj.service_type === 'overnight' ? 'per night' : `${selectedServiceObj.duration_minutes} min`} · £${(clientPriceCents(selectedServiceObj.price_cents) / 100).toFixed(2)}`
    : '30 min slots'

  function handlePrev() {
    if (isMobile) {
      if (atMobileStart) return
      const candidate = shiftDate(mobileAnchor, -MOBILE_PANE_DAYS)
      setMobileAnchor(candidate < todayStr ? todayStr : candidate)
    } else {
      setWeekOffset((w) => Math.max(0, w - 1))
    }
  }
  function handleNext() {
    if (isMobile) setMobileAnchor((a) => shiftDate(a, MOBILE_PANE_DAYS))
    else setWeekOffset((w) => w + 1)
  }
  const prevDisabled = isMobile ? atMobileStart : weekOffset === 0

  return (
    <div>
      {!initialServiceId && (
        <button
          type="button"
          onClick={() => setServiceModalOpen(true)}
          className="cursor-pointer w-full flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-3 hover:border-indigo-300 transition text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{serviceLabel}</p>
            <p className="text-xs text-gray-500 truncate">{serviceSubLabel}</p>
          </div>
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        </button>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={handlePrev} disabled={prevDisabled} aria-label="Previous" className="cursor-pointer p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900">{headerLabel}</span>
        <button onClick={handleNext} aria-label="Next" className="cursor-pointer p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Time grid */}
      {isMobile ? (
        <div
          ref={wrapperRef}
          className="border border-gray-200 rounded-lg overflow-x-hidden overflow-y-auto overscroll-none bg-white"
          style={{ maxHeight: MOBILE_GRID_MAX_HEIGHT, touchAction: 'pan-y' }}
        >
          <div
            ref={trackRef}
            className="flex"
            style={{ width: '300%', transform: 'translateX(-33.333%)' }}
          >
            <div className="w-1/3 shrink-0">
              <DayPane dates={prevPaneDates} />
            </div>
            <div className="w-1/3 shrink-0">
              <DayPane dates={currentPaneDates} paneRef={gridRef} interactive />
            </div>
            <div className="w-1/3 shrink-0">
              <DayPane dates={nextPaneDates} />
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <DayPane dates={weekDates} paneRef={gridRef} interactive />
        </div>
      )}

      {/* Footer */}
      {!hideFooter && (
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
      )}

      <Modal open={serviceModalOpen} onClose={() => setServiceModalOpen(false)} title="Service">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setSelectedService(''); setServiceModalOpen(false) }}
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">All services</p>
              <p className="text-xs text-gray-500">30 min slots</p>
            </div>
            {selectedService === '' && <Check size={16} className="text-indigo-600 shrink-0" />}
          </button>
          {walkerServices.filter((s) => s.active).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelectedService(s.id); setServiceModalOpen(false) }}
              className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {s.service_type === 'overnight' ? 'per night' : `${s.duration_minutes} min`} · £{(clientPriceCents(s.price_cents) / 100).toFixed(2)}
                </p>
              </div>
              {selectedService === s.id && <Check size={16} className="text-indigo-600 shrink-0" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
