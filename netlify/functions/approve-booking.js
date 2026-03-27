import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, formatDateTime } from './lib/notify.js'

function createAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

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
    // Batch approve: fetch all bookings in the payment group
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
      .update({ status: 'approved' })
      .in('id', ids)

    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to approve bookings' }) }
    }

    // Transition payment to awaiting_payment
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('payments')
      .update({ status: 'awaiting_payment' })
      .eq('id', payment_id)
      .eq('status', 'pending_approval')

    // Notify client
    const { data: walkerUser } = await adminSupabase.from('walker_profiles').select('business_name').eq('id', bookings[0].walker_id).single()
    const walkerName = walkerUser?.business_name || 'Your walker'
    notify(adminSupabase, bookings[0].client_id, {
      type: 'booking_approved',
      title: 'Booking approved',
      body: `${walkerName} approved your booking — pay now to confirm`,
      link: '/account/bookings',
      emailSubject: `Your booking with ${walkerName} has been approved`,
      emailHtml: emailTemplate('Booking approved', [
        `Great news! <strong>${walkerName}</strong> has approved your booking.`,
        'You can now proceed to pay from your bookings page.',
      ], 'Pay now', 'https://onestopdog.shop/account/bookings'),
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { approvedIds: ids } }),
    }
  }

  // Single booking approve
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
    return { statusCode: 400, body: JSON.stringify({ error: `Cannot approve booking with status: ${booking.status}` }) }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'approved' })
    .eq('id', booking_id)
    .select('*')
    .single()

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to approve booking' }) }
  }

  // Transition payment to awaiting_payment if all bookings in this payment are approved
  if (updated.payment_id) {
    const adminSupabase = createAdminClient()
    const { data: siblings } = await adminSupabase
      .from('bookings')
      .select('id, status')
      .eq('payment_id', updated.payment_id)

    const allApprovedOrBeyond = siblings?.every((b) =>
      ['approved', 'hold', 'confirmed'].includes(b.status),
    )
    if (allApprovedOrBeyond) {
      await adminSupabase
        .from('payments')
        .update({ status: 'awaiting_payment' })
        .eq('id', updated.payment_id)
        .eq('status', 'pending_approval')
    }
  }

  // Notify client
  const adminSupabase2 = createAdminClient()
  const { data: wp } = await adminSupabase2.from('walker_profiles').select('business_name').eq('id', updated.walker_id).single()
  const { data: svc } = await adminSupabase2.from('services').select('name').eq('id', updated.service_id).single()
  const wName = wp?.business_name || 'Your walker'
  const svcName = svc?.name || 'booking'
  const when = formatDateTime(updated.booking_date, updated.start_time)
  notify(adminSupabase2, updated.client_id, {
    type: 'booking_approved',
    title: 'Booking approved',
    body: `${wName} approved your ${svcName} on ${when}`,
    link: '/account/bookings',
    emailSubject: `Your booking with ${wName} has been approved`,
    emailHtml: emailTemplate('Booking approved', [
      `Great news! <strong>${wName}</strong> has approved your <strong>${svcName}</strong> on ${when}.`,
      'You can now proceed to pay from your bookings page.',
    ], 'Pay now', 'https://onestopdog.shop/account/bookings'),
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { booking: updated } }),
  }
}
