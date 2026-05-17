import { useRef, useState } from 'react'
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, addDays,
  isSameDay, isToday, isSameMonth, format,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DaySegments from './DaySegments'
import { isEventPast } from '../../lib/eventTime'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const SWIPE_THRESHOLD = 40
const DRAG_THRESHOLD = 10

function buildDays(m) {
  const monthStart = startOfMonth(m)
  const monthEnd = endOfMonth(m)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  // Always render 6 rows so calendar height is consistent month-to-month
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1))
  }
  return days
}

function MonthGrid({ month, days, eventsByDay, selectedDate, onSelect, suppressClickRef }) {
  const today = new Date()
  return (
    <div className="grid grid-cols-7 grid-rows-6 w-1/3 shrink-0 h-full lg:grid-rows-none lg:h-auto">
      {days.map((day, i) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const events = eventsByDay[dateKey] || []
        const inMonth = isSameMonth(day, month)
        const isSelected = inMonth && selectedDate && isSameDay(day, selectedDate)
        const isTodayCell = inMonth && isToday(day) && !isSelected
        const isPastDay = day < today && !isSameDay(day, today)
        const isPast = isPastDay || (events.length > 0 && events.every((e) => isEventPast(e, today)))
        const rowIndex = Math.floor(i / 7)

        let numberClass = 'text-gray-700'
        if (isPastDay) numberClass = 'text-gray-400'
        if (isTodayCell) numberClass = 'text-indigo-600 font-semibold'

        function handleClick() {
          if (suppressClickRef?.current) return
          onSelect(day)
        }

        return (
          <button
            key={dateKey}
            type="button"
            onClick={handleClick}
            className={`cursor-pointer min-h-0 lg:aspect-square lg:h-auto flex flex-col items-center justify-center py-0 lg:py-1 hover:bg-gray-50 rounded-lg ${
              rowIndex > 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            {inMonth ? (
              <span
                className={`flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${
                  isSelected ? 'bg-gray-900 text-white' : numberClass
                }`}
              >
                {format(day, 'd')}
              </span>
            ) : (
              <span className="w-7 h-7" aria-hidden />
            )}
            <div className={isPast ? 'opacity-40' : ''}>
              <DaySegments events={inMonth ? events : []} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function MonthCalendar({
  eventsByDay,
  selectedDate,
  onSelect,
  onToday,
  month,
  onMonthChange,
}) {
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const widthRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [pendingMonth, setPendingMonth] = useState(null)

  const prevMonth = subMonths(month, 1)
  const nextMonth = addMonths(month, 1)
  const prevDays = buildDays(prevMonth)
  const days = buildDays(month)
  const nextDays = buildDays(nextMonth)

  function handlePrev() { onMonthChange(subMonths(month, 1)) }
  function handleNext() { onMonthChange(addMonths(month, 1)) }

  function handleTouchStart(e) {
    if (e.touches.length !== 1 || pendingMonth) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    suppressClickRef.current = false
    setDragging(true)
  }
  function handleTouchMove(e) {
    if (touchStartX.current == null) return
    const ddx = e.touches[0].clientX - touchStartX.current
    const ddy = e.touches[0].clientY - touchStartY.current
    if (!suppressClickRef.current && Math.abs(ddy) > Math.abs(ddx) && Math.abs(ddy) > DRAG_THRESHOLD) {
      touchStartX.current = null
      setDragging(false)
      setDx(0)
      return
    }
    if (Math.abs(ddx) > DRAG_THRESHOLD) suppressClickRef.current = true
    setDx(ddx)
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const final = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(final) < SWIPE_THRESHOLD) {
      setDragging(false)
      setDx(0)
      return
    }
    const width = widthRef.current?.offsetWidth || window.innerWidth
    setDragging(false)
    setDx(final > 0 ? width : -width)
    setPendingMonth(final > 0 ? prevMonth : nextMonth)
  }
  function handleTransitionEnd() {
    if (!pendingMonth) return
    setDragging(true)
    setDx(0)
    onMonthChange(pendingMonth)
    setPendingMonth(null)
    requestAnimationFrame(() => requestAnimationFrame(() => setDragging(false)))
  }

  return (
    <div className="min-w-0 flex flex-col h-full lg:block lg:h-auto">
      <div className="hidden lg:flex items-center justify-between mb-4">
        <h2 className="text-3xl font-bold text-gray-900">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous month"
            className="cursor-pointer p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="cursor-pointer px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next month"
            className="cursor-pointer p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1 shrink-0">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div
        ref={widthRef}
        className="overflow-hidden touch-pan-y flex-1 min-h-0 lg:flex-none lg:min-h-[auto]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex w-[300%] h-full lg:h-auto"
          style={{
            transform: `translateX(calc(-33.3333% + ${dx}px))`,
            transition: dragging ? 'none' : 'transform 200ms ease-out',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          <MonthGrid month={prevMonth} days={prevDays} eventsByDay={eventsByDay} selectedDate={selectedDate} onSelect={onSelect} suppressClickRef={suppressClickRef} />
          <MonthGrid month={month} days={days} eventsByDay={eventsByDay} selectedDate={selectedDate} onSelect={onSelect} suppressClickRef={suppressClickRef} />
          <MonthGrid month={nextMonth} days={nextDays} eventsByDay={eventsByDay} selectedDate={selectedDate} onSelect={onSelect} suppressClickRef={suppressClickRef} />
        </div>
      </div>
    </div>
  )
}
