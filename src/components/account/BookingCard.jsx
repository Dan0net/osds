import { Clock, Moon, ChevronRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BookingCard({
  serviceName,
  date,
  endDate,
  startTime,
  endTime,
  to,
  state,
  right,
  statusBadge,
  onCancel,
  children,
}) {
  const isOvernight = !!(endDate && endDate !== date)
  const Icon = isOvernight ? Moon : Clock
  const dateLabel = formatDateRange(date, endDate, isOvernight)
  const timeLabel = formatTimeRange(startTime, endTime, isOvernight)

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 truncate">{serviceName || 'Booking'}</p>
            {statusBadge}
          </div>
          {(dateLabel || timeLabel) && (
            <p className="text-xs text-gray-500 truncate">
              {dateLabel}
              {dateLabel && timeLabel ? ' · ' : ''}
              {timeLabel}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
        {onCancel && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel() }}
            aria-label="Cancel booking"
            className="cursor-pointer shrink-0 p-1.5 -m-1.5 text-gray-400 hover:text-red-600 transition"
          >
            <Trash2 size={16} />
          </button>
        )}
        {to && !onCancel && <ChevronRight size={18} className="text-gray-400 shrink-0 self-center" />}
      </div>
      {children}
    </>
  )

  const className = 'block bg-white border border-gray-200 rounded-lg p-3'

  if (to) {
    return (
      <Link to={to} state={state} className={`${className} hover:border-indigo-300 hover:bg-indigo-50/40 transition`}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}

function formatDateRange(date, endDate, isOvernight) {
  if (!date) return ''
  const d = parseDate(date)
  const fmt = (x) => x.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  if (isOvernight && endDate) {
    return `${fmt(d)} → ${fmt(parseDate(endDate))}`
  }
  return fmt(d)
}

function formatTimeRange(start, end, isOvernight) {
  if (!start) return ''
  const s = start.slice(0, 5)
  const e = end?.slice(0, 5)
  if (!e) return s
  if (isOvernight) return `${s} drop-off · ${e} pick-up`
  return `${s}–${e}`
}

function parseDate(d) {
  return new Date(d.length === 10 ? d + 'T00:00:00' : d)
}
