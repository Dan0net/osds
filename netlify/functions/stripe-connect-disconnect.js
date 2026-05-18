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

  const { data: wp, error: wpError } = await supabase
    .from('walker_profiles')
    .select('id, stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (wpError || !wp) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No walker profile found' }) }
  }

  if (!wp.stripe_account_id) {
    return { statusCode: 200, body: JSON.stringify({ data: { disconnected: true } }) }
  }

  const { count: pendingCount, error: countError } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('walker_id', wp.id)
    .eq('source', 'stripe')
    .eq('status', 'awaiting_payment')

  if (countError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check pending payments' }) }
  }

  if (pendingCount && pendingCount > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `You have ${pendingCount} unpaid Stripe payment${pendingCount === 1 ? '' : 's'}. Wait for ${pendingCount === 1 ? 'it' : 'them'} to be paid or refund the bookings before disconnecting.`,
      }),
    }
  }

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

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
    body: JSON.stringify({ data: { disconnected: true } }),
  }
}
