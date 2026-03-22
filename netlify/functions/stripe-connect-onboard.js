import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

  // Verify user has a walker profile
  const { data: wp, error: wpError } = await supabase
    .from('walker_profiles')
    .select('id, stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (wpError || !wp) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No walker profile found' }) }
  }

  // Create or reuse Stripe Connect account
  let accountId = wp.stripe_account_id
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    accountId = account.id

    // Save to walker_profiles using service role to bypass RLS
    const adminSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    const { error: updateError } = await adminSupabase
      .from('walker_profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', wp.id)

    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save Stripe account' }) }
    }
  }

  // Create an account link for onboarding
  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/account/profile?stripe=refresh`,
    return_url: `${siteUrl}/account/profile?stripe=complete`,
    type: 'account_onboarding',
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { url: accountLink.url } }),
  }
}
