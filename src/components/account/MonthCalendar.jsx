import { useRef } from 'react'
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, isSameMonth, format,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DaySegments from './DaySegments'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const SWIPE_THRESHOLD = 40

export default function MonthCalendar({
  eventsByDay,
  selectedDate,
  onSelect,
  onToday,
  month,
  onMonthChange,
}) {
  const touchStartX = useRef(null)

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const today = new Date()

  function handlePrev() { onMonthChange(subMonths(month, 1)) }
  function handleNext() { onMonthChange(addMonths(month, 1)) }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (dx > 0) handlePrev()
    else handleNext()
  }

  return (
    <div className="flex-1 min-w-0">
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

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const events = eventsByDay[dateKey] || []
          const inMonth = isSameMonth(day, month)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isTodayCell = isToday(day) && !isSelected
          const isPast = day < today && !isSameDay(day, today)

          let numberClass = 'text-gray-700'
          if (!inMonth) numberClass = 'text-gray-300'
          else if (isPast) numberClass = 'text-gray-400'
          if (isTodayCell) numberClass = 'text-indigo-600 font-semibold'

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelect(day)}
              className="cursor-pointer h-9 lg:aspect-square lg:h-auto flex flex-col items-center justify-center py-0 lg:py-1 hover:bg-gray-50 rounded-lg"
            >
              <span
                className={`flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${
                  isSelected ? 'bg-gray-900 text-white' : numberClass
                }`}
              >
                {format(day, 'd')}
              </span>
              <DaySegments events={events} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
