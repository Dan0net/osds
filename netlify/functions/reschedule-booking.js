import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, formatDateTime } from './lib/notify.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const { booking_id, new_date, new_start_time, new_end_time, new_end_date } = JSON.parse(event.body)
  if (!booking_id || !new_date || !new_start_time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'booking_id, new_date, and new_start_time are required' }) }
  }

  // Fetch booking
  const { data: booking, error: bkError } = await supabase
    .from('bookings')
    .select('*, walker_profiles!inner(user_id), services(duration_minutes, service_type)')
    .eq('id', booking_id)
    .single()

  if (bkError || !booking) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) }
  }

  // Only the walker can reschedule
  if (booking.walker_profiles.user_id !== user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the walker can reschedule' }) }
  }

  const reschedulable = ['approved', 'confirmed', 'pending']
  if (!reschedulable.includes(booking.status)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Cannot reschedule booking with status: ${booking.status}` }) }
  }

  // Check the new slot is not blocked
  const { data: blocked } = await adminSupabase
    .from('blocked_dates')
    .select('id')
    .eq('walker_id', booking.walker_id)
    .eq('date', new_date)
    .limit(1)

  if (blocked && blocked.length > 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'New date is blocked' }) }
  }

  // Check for conflicts at new date/time
  const blockingStatuses = ['approved', 'hold', 'confirmed', 'pending']
  const { data: existing } = await adminSupabase
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('walker_id', booking.walker_id)
    .eq('booking_date', new_date)
    .in('status', blockingStatuses)
    .neq('id', booking_id) // Exclude the booking being rescheduled

  const duration = booking.services?.duration_minutes || 30
  const [newH, newM] = new_start_time.split(':').map(Number)
  const newStartMin = newH * 60 + newM
  const newEndMin = newStartMin + duration

  for (const bk of (existing || [])) {
    const [bkH, bkM] = bk.start_time.split(':').map(Number)
    const bkStartMin = bkH * 60 + bkM
    let bkEndMin = bkStartMin + 30
    if (bk.end_time) {
      const [bkEH, bkEM] = bk.end_time.split(':').map(Number)
      bkEndMin = bkEH * 60 + bkEM
    }
    if (newStartMin < bkEndMin && newEndMin > bkStartMin) {
      return { statusCode: 409, body: JSON.stringify({ error: 'New slot conflicts with existing booking' }) }
    }
  }

  // Compute end_time if not provided
  const endTime = new_end_time || `${String(Math.floor(newEndMin / 60)).padStart(2, '0')}:${String(newEndMin % 60).padStart(2, '0')}`

  const updateData = {
    booking_date: new_date,
    start_time: new_start_time,
    end_time: endTime,
  }
  if (new_end_date) {
    updateData.end_date = new_end_date
  }

  const { data: updated, error: updateError } = await adminSupabase
    .from('bookings')
    .update(updateData)
    .eq('id', booking_id)
    .select('*')
    .single()

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to reschedule' }) }
  }

  // Notify client of reschedule
  const { data: wp } = await adminSupabase.from('walker_profiles').select('business_name').eq('id', booking.walker_id).single()
  const { data: rSvc } = await adminSupabase.from('services').select('name').eq('id', booking.service_id).single()
  const walkerName = wp?.business_name || 'Your walker'
  const svcName = rSvc?.name || 'booking'
  const oldWhen = formatDateTime(booking.booking_date, booking.start_time)
  const newWhen = formatDateTime(new_date, new_start_time)
  notify(adminSupabase, booking.client_id, {
    type: 'booking_rescheduled',
    title: 'Booking rescheduled',
    body: `${walkerName} moved your ${svcName} from ${oldWhen} to ${newWhen}`,
    link: '/account/bookings',
    emailSubject: `${walkerName} rescheduled your booking`,
    emailHtml: emailTemplate('Booking rescheduled', [
      `<strong>${walkerName}</strong> has moved your <strong>${svcName}</strong>.`,
      `<strong>From:</strong> ${oldWhen}`,
      `<strong>To:</strong> ${newWhen}`,
    ], 'View bookings', 'https://onestopdog.shop/account/bookings'),
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { booking: updated } }),
  }
}
