import { createClient } from '@supabase/supabase-js'

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

  const { booking_id, batch_id } = JSON.parse(event.body)
  if (!booking_id && !batch_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'booking_id or batch_id is required' }) }
  }

  if (batch_id) {
    // Batch decline: fetch all bookings in the batch
    const { data: bookings, error: bkError } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id)')
      .eq('batch_id', batch_id)
      .eq('status', 'requested')

    if (bkError || !bookings || bookings.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No requested bookings found for this batch' }) }
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { booking: updated } }),
  }
}
