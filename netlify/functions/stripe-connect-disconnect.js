import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, esc } from './lib/notify.js'

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

  const { data: wp, error: wpError } = await supabase
    .from('walker_profiles')
    .select('id, business_name, stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (wpError || !wp) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No walker profile found' }) }
  }

  if (!wp.stripe_account_id) {
    return { statusCode: 200, body: JSON.stringify({ data: { disconnected: true } }) }
  }

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: awaitingPayments, error: payErr } = await adminSupabase
    .from('payments')
    .select('id, client_id')
    .eq('walker_id', wp.id)
    .eq('source', 'stripe')
    .eq('status', 'awaiting_payment')

  if (payErr) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check pending payments' }) }
  }

  const awaitingCount = awaitingPayments?.length || 0
  const { cancel_pending } = JSON.parse(event.body || '{}')

  if (awaitingCount > 0 && !cancel_pending) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { awaiting_count: awaitingCount } }),
    }
  }

  if (awaitingCount > 0) {
    const paymentIds = awaitingPayments.map((p) => p.id)

    await adminSupabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('payment_id', paymentIds)
      .not('status', 'in', '(cancelled,declined,refunded)')

    await adminSupabase
      .from('payments')
      .update({ status: 'cancelled', total_cents: 0 })
      .in('id', paymentIds)

    const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
    const walkerName = wp.business_name || 'Your walker'
    await Promise.all(awaitingPayments.map((p) => notify(adminSupabase, {
      walkerId: wp.id,
      clientId: p.client_id,
      recipientUserId: p.client_id,
      event: {
        type: 'booking_cancelled',
        title: 'Bookings cancelled',
        body: `${walkerName} has cancelled your unpaid bookings`,
        link: `/account/money/${p.id}`,
        emailSubject: `${walkerName} has cancelled your unpaid bookings`,
        emailHtml: emailTemplate('Bookings cancelled', [
          `<strong>${esc(walkerName)}</strong> has cancelled your unpaid bookings because they're no longer accepting online payments.`,
          'No payment was taken. You can book again later or with another walker.',
        ], 'View details', `${siteUrl}/account/money/${p.id}`),
      },
    }).catch((err) => console.error('Notify failed for payment', p.id, err))))
  }

  const { error: updateError } = await adminSupabase
    .from('walker_profiles')
    .update({ stripe_account_id: null, stripe_charges_enabled: false })
    .eq('id', wp.id)

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to disconnect Stripe' }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { disconnected: true, cancelled_count: awaitingCount } }),
  }
}
