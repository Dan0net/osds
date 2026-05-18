import { parseISO, format } from 'date-fns'

export function isEventPast(event, now = new Date()) {
  const todayKey = format(now, 'yyyy-MM-dd')
  if (event.end_date && event.end_date !== event.booking_date) {
    return event.end_date < todayKey
  }
  if (!event.start_time) {
    return event.booking_date < todayKey
  }
  const startDt = parseISO(`${event.booking_date}T${event.start_time}`)
  const endDt = new Date(startDt.getTime() + (event.durationMinutes || 30) * 60000)
  return endDt < now
}
