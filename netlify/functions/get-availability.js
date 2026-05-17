import { createClient } from '@supabase/supabase-js'
import { fetchExternalEvents } from './lib/ical-import.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function getDayOfWeek(dateStr) {
  const jsDay = new Date(dateStr + 'T00:00:00').getDay()
  return jsDay === 0 ? 7 : jsDay // Mon=1...Sun=7
}

function generateDates(startDate, endDate) {
  const dates = []
  const d = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function computeSlotsForDate(date, { duration, isOvernight, blockedSet, availByDay, standardBookings, overnightBookings, externalEvents }) {
  if (blockedSet.has(date)) {
    return { slots: [], allSlots: [], blocked: true }
  }

  const dayOfWeek = getDayOfWeek(date)
  const window = availByDay[dayOfWeek]
  if (!window) {
    return { slots: [], allSlots: [], noAvailability: true }
  }

  const [startH, startM] = window.start_time.split(':').map(Number)
  const [endH, endM] = window.end_time.split(':').map(Number)
  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  if (isOvernight) {
    startMinutes = Math.max(startMinutes, 7 * 60)
    endMinutes = Math.min(endMinutes, 19 * 60)
  }

  // Generate all possible 30-min slots in the walker's working window.
  // Duration-fit is decided client-side at placement time.
  const allSlots = []
  for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    allSlots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }

  // Build slot usage from standard bookings on this date
  const slotUsage = {}
  const dateStandard = standardBookings.filter((b) => b.booking_date === date)
  for (const booking of dateStandard) {
    if (booking.end_date && booking.end_date !== booking.booking_date) continue
    const [bStartH, bStartM] = booking.start_time.split(':').map(Number)
    const bStartMin = bStartH * 60 + bStartM
    let bDuration = 30
    if (booking.end_time) {
      const [bEndH, bEndM] = booking.end_time.split(':').map(Number)
      bDuration = (bEndH * 60 + bEndM) - bStartMin
    }
    const buffer = booking.services?.buffer_after_minutes || 0
    for (let m = bStartMin; m < bStartMin + bDuration + buffer; m += 30) {
      const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      slotUsage[slotTime] = (slotUsage[slotTime] || 0) + 1
    }
  }

  // Process overnight bookings that span this date
  const overnightBlocked = new Set()
  for (const booking of overnightBookings) {
    if (booking.end_date === booking.booking_date) continue
    if (!(date >= booking.booking_date && date <= booking.end_date)) continue

    const reopenedSlots = booking.reopened_slots || []
    for (const slot of allSlots) {
      const [h, m] = slot.split(':').map(Number)
      const slotMin = h * 60 + m
      let inRange = false

      if (date > booking.booking_date && date < booking.end_date) {
        inRange = true
      } else if (date === booking.booking_date) {
        const [sh, sm] = booking.start_time.split(':').map(Number)
        inRange = slotMin >= sh * 60 + sm
      } else if (date === booking.end_date) {
        const [eh, em] = booking.end_time.split(':').map(Number)
        inRange = slotMin < eh * 60 + em
      }

      if (inRange) {
        const reopened = reopenedSlots.some((s) => s.date === date && s.time === slot)
        if (reopened && !isOvernight && duration < 180) {
          continue
        }
        overnightBlocked.add(slot)
      }
    }
  }

  // External calendar events
  for (const ext of externalEvents) {
    if (ext.date !== date) continue
    if (ext.allDay) {
      for (let m = startMinutes; m < endMinutes; m += 30) {
        const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        slotUsage[slotTime] = (slotUsage[slotTime] || 0) + 1
      }
    } else if (ext.start_time && ext.end_time) {
      const [eStartH, eStartM] = ext.start_time.split(':').map(Number)
      const [eEndH, eEndM] = ext.end_time.split(':').map(Number)
      const eStart = eStartH * 60 + eStartM
      const eEnd = eEndH * 60 + eEndM
      for (let m = eStart; m < eEnd; m += 30) {
        const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        slotUsage[slotTime] = (slotUsage[slotTime] || 0) + 1
      }
    }
  }

  // Base availability per 30-min cell — duration-fit is gated client-side.
  const slots = allSlots.filter((slot) =>
    !overnightBlocked.has(slot) && (slotUsage[slot] || 0) < 1,
  )

  return { slots, allSlots }
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const params = event.queryStringParameters || {}
  const { walker_id, start_date, end_date, duration_minutes, service_type } = params
  const duration = parseInt(duration_minutes) || 30
  const isOvernight = service_type === 'overnight'

  if (!walker_id || !start_date || !end_date) {
    return { statusCode: 400, body: JSON.stringify({ error: 'walker_id, start_date, and end_date are required' }) }
  }

  const dates = generateDates(start_date, end_date)
  if (dates.length > 35) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Date range too large (max 35 days)' }) }
  }

  const uniqueDays = [...new Set(dates.map(getDayOfWeek))]
  const blockingStatuses = ['approved', 'hold', 'confirmed']

  // All queries in parallel
  const [blockedResult, availResult, standardResult, overnightResult, externalResult] = await Promise.all([
    supabase.from('blocked_dates').select('id, date').eq('walker_id', walker_id).gte('date', start_date).lte('date', end_date),
    supabase.from('availability').select('*').eq('walker_id', walker_id).in('day_of_week', uniqueDays),
    supabase.from('bookings').select('*, services(duration_minutes, service_type, buffer_after_minutes)').eq('walker_id', walker_id).eq('blocks_slot', true).gte('booking_date', start_date).lte('booking_date', end_date).in('status', blockingStatuses),
    supabase.from('bookings').select('*').eq('walker_id', walker_id).eq('blocks_slot', true).in('status', blockingStatuses).not('end_date', 'is', null).lte('booking_date', end_date).gte('end_date', start_date),
    fetchExternalEvents(supabase, walker_id, { allowStale: true }),
  ])

  const blockedSet = new Set((blockedResult.data || []).map((b) => b.date))
  const availByDay = {}
  for (const a of (availResult.data || [])) {
    availByDay[a.day_of_week] = a
  }
  const standardBookings = standardResult.data || []
  const overnightBookings = overnightResult.data || []
  const externalEvents = externalResult.events || []

  // Compute slots for each date
  const result = {}
  for (const date of dates) {
    result[date] = computeSlotsForDate(date, {
      duration, isOvernight, blockedSet, availByDay,
      standardBookings, overnightBookings, externalEvents,
    })
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: result }),
  }
}
