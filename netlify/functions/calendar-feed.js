import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createEvents } from 'ics'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function parseTimeStr(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return { hours: h, minutes: m }
}

export async function handler(event) {
  // Parse path: /cal/:walker_id/:token.ics
  const match = event.path.match(/\/cal\/([^/]+)\/([^/]+)\.ics$/)
  if (!match) {
    return { statusCode: 404, body: 'Not found' }
  }

  const [, walkerId, providedToken] = match

  // Fetch walker profile
  const { data: wp } = await supabase
    .from('walker_profiles')
    .select('id, calendar_feed_token, business_name')
    .eq('id', walkerId)
    .single()

  if (!wp || !wp.calendar_feed_token) {
    return { statusCode: 404, body: 'Not found' }
  }

  // Timing-safe token comparison
  const a = Buffer.from(providedToken, 'utf8')
  const b = Buffer.from(wp.calendar_feed_token, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { statusCode: 404, body: 'Not found' }
  }

  // Fetch confirmed bookings within ±90 day window
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 90)
  const end = new Date(now)
  end.setDate(end.getDate() + 90)

  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(name, duration_minutes, service_type)')
    .eq('walker_id', walkerId)
    .eq('status', 'confirmed')
    .gte('booking_date', startStr)
    .lte('booking_date', endStr)

  if (!bookings || bookings.length === 0) {
    // Return empty but valid calendar
    const empty = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//onestopdog.shop//OSDS//EN`,
      `X-WR-CALNAME:${wp.business_name || 'OSDS'} Bookings`,
      'END:VCALENDAR',
    ].join('\r\n')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="bookings.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: empty,
    }
  }

  // Build ICS events — titles use service name only (never client names)
  const icsEvents = bookings.map((b) => {
    const serviceName = b.services?.name || 'Booking'
    const d = parseDateStr(b.booking_date)
    const t = parseTimeStr(b.start_time)

    const icsEvent = {
      title: serviceName,
      uid: `${b.id}@onestopdog.shop`,
      start: [d.year, d.month, d.day, t.hours, t.minutes],
      productId: 'onestopdog.shop',
      calName: `${wp.business_name || 'OSDS'} Bookings`,
    }

    if (b.end_date && b.end_time && b.end_date !== b.booking_date) {
      // Overnight booking
      const ed = parseDateStr(b.end_date)
      const et = parseTimeStr(b.end_time)
      icsEvent.end = [ed.year, ed.month, ed.day, et.hours, et.minutes]
    } else if (b.end_time) {
      const et = parseTimeStr(b.end_time)
      icsEvent.end = [d.year, d.month, d.day, et.hours, et.minutes]
    } else {
      // Fallback: use service duration
      icsEvent.duration = { minutes: b.services?.duration_minutes || 30 }
    }

    return icsEvent
  })

  const { error: icsError, value: icsString } = createEvents(icsEvents)

  if (icsError || !icsString) {
    return { statusCode: 500, body: 'Failed to generate calendar' }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="bookings.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: icsString,
  }
}
