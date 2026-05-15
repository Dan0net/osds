import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'

const STATUS_LABELS = {
  requested: 'Pending',
  approved: 'Approved',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  pending: 'Awaiting payment',
  hold: 'On hold',
  refunded: 'Refunded',
}

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  pending: 'bg-blue-100 text-blue-700',
  hold: 'bg-purple-100 text-purple-700',
  refunded: 'bg-gray-100 text-gray-600',
}

function dayHeading(dateStr) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE d MMMM')
}

export default function UpcomingList({ eventsByDay }) {
  const sortedDays = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return Object.keys(eventsByDay)
      .filter((d) => d >= today)
      .sort()
  }, [eventsByDay])

  if (sortedDays.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-400">No upcoming bookings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDays.map((dateStr) => (
        <section key={dateStr}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{dayHeading(dateStr)}</h3>
          <div className="space-y-2">
            {eventsByDay[dateStr].map((event, i) => {
              const inner = (
                <>
                  <span
                    className="w-1 rounded-full shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-sm truncate">{event.title}</span>
                      <span className="text-xs text-gray-500 shrink-0">{event.timeLabel}</span>
                    </div>
                    {event.subtitle && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{event.subtitle}</p>
                    )}
                    {event.status && (
                      <span className={`inline-block mt-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[event.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[event.status] || event.status}
                      </span>
                    )}
                  </div>
                </>
              )
              if (event.external) {
                return (
                  <div key={event.id + '-' + i} className="flex items-stretch gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    {inner}
                  </div>
                )
              }
              return (
                <Link
                  key={event.id + '-' + i}
                  to={`/account/bookings/${event.id}`}
                  className="flex items-stretch gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition"
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
