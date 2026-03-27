import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate } from './lib/notify.js'

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

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const { booking_id, payment_id } = JSON.parse(event.body)
  if (!booking_id && !payment_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'booking_id or payment_id is required' }) }
  }

  if (payment_id) {
    // Batch decline: fetch all bookings in the payment group
    const { data: bookings, error: bkError } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id)')
      .eq('payment_id', payment_id)
      .eq('status', 'requested')

    if (bkError || !bookings || bookings.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No requested bookings found for this payment' }) }
    }

    if (bookings.some((b) => b.walker_profiles.user_id !== user.id)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Not your bookings to manage' }) }
    }

    const ids = bookings.map((b) => b.id)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .in('id', ids)

    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to decline bookings' }) }
    }

    // Notify client
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: wp } = await adminSupabase.from('walker_profiles').select('business_name').eq('id', bookings[0].walker_id).single()
    const walkerName = wp?.business_name || 'Your walker'
    notify(adminSupabase, bookings[0].client_id, {
      type: 'booking_declined',
      title: 'Booking declined',
      body: `${walkerName} declined your booking request`,
      link: '/account/bookings',
      emailSubject: `${walkerName} declined your booking request`,
      emailHtml: emailTemplate('Booking declined', [
        `Unfortunately, <strong>${walkerName}</strong> was unable to accept your booking request.`,
        'You can browse other walkers or try different dates.',
      ]),
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { declinedIds: ids } }),
    }
  }

  // Single booking decline
  const { data: booking, error: bkError } = await supabase
    .from('bookings')
    .select('*, walker_profiles!inner(user_id)')
    .eq('id', booking_id)
    .single()

  if (bkError || !booking) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) }
  }

  if (booking.walker_profiles.user_id !== user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not your booking to manage' }) }
  }

  if (booking.status !== 'requested') {
    return { statusCode: 400, body: JSON.stringify({ error: `Cannot decline booking with status: ${booking.status}` }) }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'declined' })
    .eq('id', booking_id)
    .select('*')
    .single()

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to decline booking' }) }
  }

  // Notify client
  const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: wp } = await adminSupabase.from('walker_profiles').select('business_name').eq('id', updated.walker_id).single()
  const wName = wp?.business_name || 'Your walker'
  notify(adminSupabase, updated.client_id, {
    type: 'booking_declined',
    title: 'Booking declined',
    body: `${wName} declined your booking for ${updated.booking_date}`,
    link: '/account/bookings',
    emailSubject: `${wName} declined your booking request`,
    emailHtml: emailTemplate('Booking declined', [
      `Unfortunately, <strong>${wName}</strong> was unable to accept your booking for ${updated.booking_date}.`,
      'You can browse other walkers or try different dates.',
    ]),
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { booking: updated } }),
  }
}
