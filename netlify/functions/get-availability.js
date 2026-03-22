import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS — this function runs server-side only
// and returns only computed slot times, never raw booking data
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const params = event.queryStringParameters || {}
  const { walker_id, date, duration_minutes, service_type } = params
  const duration = parseInt(duration_minutes) || 30
  const isOvernight = service_type === 'overnight'

  if (!walker_id || !date) {
    return { statusCode: 400, body: JSON.stringify({ error: 'walker_id and date are required' }) }
  }

  // Get day of week (0=Sun, 1=Mon ... 6=Sat in JS, but schema uses 0-6 where 0=Sun)
  const dateObj = new Date(date + 'T00:00:00')
  const jsDay = dateObj.getDay() // 0=Sun
  const dayOfWeek = jsDay // schema uses 0=Sun, 1=Mon...6=Sat

  // Check if date is blocked
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('walker_id', walker_id)
    .eq('date', date)
    .limit(1)

  if (blocked && blocked.length > 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { slots: [], blocked: true } }),
    }
  }

  // Get availability for this day of week
  const { data: avail } = await supabase
    .from('availability')
    .select('*')
    .eq('walker_id', walker_id)
    .eq('day_of_week', dayOfWeek)

  if (!avail || avail.length === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { slots: [], noAvailability: true } }),
    }
  }

  const window = avail[0]
  const [startH, startM] = window.start_time.split(':').map(Number)
  const [endH, endM] = window.end_time.split(':').map(Number)
  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  if (isOvernight) {
    startMinutes = Math.max(startMinutes, 7 * 60)
    endMinutes = Math.min(endMinutes, 19 * 60)
  }

  // Generate all possible slots
  const allSlots = []
  for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    allSlots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }

  // Fetch existing bookings that could affect availability on this date
  // Only confirmed-path bookings block availability
  const blockingStatuses = ['approved', 'hold', 'confirmed']

  // Standard bookings on this date
  const { data: standardBookings } = await supabase
    .from('bookings')
    .select('*, services(duration_minutes, service_type)')
    .eq('walker_id', walker_id)
    .eq('booking_date', date)
    .in('status', blockingStatuses)

  // Overnight bookings that may span this date (end_date differs from booking_date)
  const { data: overnightBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('walker_id', walker_id)
    .in('status', blockingStatuses)
    .not('end_date', 'is', null)
    .lte('booking_date', date)
    .gte('end_date', date)

  // Build a map of slot -> count of bookings using that slot
  const slotUsage = {}

  // Process standard bookings
  for (const booking of (standardBookings || [])) {
    if (booking.end_date && booking.end_date !== booking.booking_date) continue // skip overnights handled below
    const [bStartH, bStartM] = booking.start_time.split(':').map(Number)
    const bStartMin = bStartH * 60 + bStartM

    // Determine duration from end_time
    let bDuration = 30
    if (booking.end_time) {
      const [bEndH, bEndM] = booking.end_time.split(':').map(Number)
      bDuration = (bEndH * 60 + bEndM) - bStartMin
    }

    // Mark all 30-min grid slots that this booking covers
    for (let m = bStartMin; m < bStartMin + bDuration; m += 30) {
      const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      slotUsage[slotTime] = (slotUsage[slotTime] || 0) + 1
    }
  }

  // Process overnight bookings that span this date
  const overnightBlocked = new Set()
  const overnightBookingsList = overnightBookings || []
  for (const booking of overnightBookingsList) {
    // Skip if end_date equals booking_date — not a real overnight, handled above as standard
    if (booking.end_date === booking.booking_date) continue

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
        // Check if reopened
        const reopened = reopenedSlots.some((s) => s.date === date && s.time === slot)
        if (reopened && !isOvernight && duration < 180) {
          continue // slot available for short non-overnight services
        }
        overnightBlocked.add(slot)
      }
    }
  }

  // Filter available slots: check capacity and overnight blocking
  const availableSlots = allSlots.filter((slot) => {
    if (overnightBlocked.has(slot)) return false

    // For multi-slot bookings, check all slots this booking would cover
    const [h, m] = slot.split(':').map(Number)
    const startMin = h * 60 + m
    for (let checkM = startMin; checkM < startMin + duration; checkM += 30) {
      const checkSlot = `${String(Math.floor(checkM / 60)).padStart(2, '0')}:${String(checkM % 60).padStart(2, '0')}`
      const usage = slotUsage[checkSlot] || 0
      // Default capacity is 1 — slot is blocked if usage >= 1
      // For group services with capacity > 1, this would need per-slot capacity tracking
      if (usage >= 1) return false
    }

    return true
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { slots: availableSlots, allSlots } }),
  }
}
