import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const OSDS_FEE_RATE = 0.05
const STRIPE_PERCENT_RATE = 0.034
const STRIPE_FIXED_PENCE = 20
const COMBINED_RATE = OSDS_FEE_RATE + STRIPE_PERCENT_RATE
function grossUp(netCents) { return Math.ceil((netCents + STRIPE_FIXED_PENCE) / (1 - COMBINED_RATE)) }

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

  const { payment_id } = JSON.parse(event.body)
  if (!payment_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'payment_id is required' }) }
  }

  // Fetch payment + bookings
  const { data: payment, error: payError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', payment_id)
    .single()

  if (payError || !payment) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Payment not found' }) }
  }

  if (payment.client_id !== user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not your payment' }) }
  }

  if (payment.status !== 'awaiting_payment') {
    return { statusCode: 400, body: JSON.stringify({ error: `Payment status is ${payment.status}, expected awaiting_payment` }) }
  }

  // Get walker's Stripe account
  const { data: wp } = await adminSupabase
    .from('walker_profiles')
    .select('stripe_account_id, business_name')
    .eq('id', payment.walker_id)
    .single()

  if (!wp?.stripe_account_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Walker has not connected Stripe' }) }
  }

  // Get booking details for line items
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(name, price_cents, duration_minutes, service_type)')
    .eq('payment_id', payment_id)
    .in('status', ['approved', 'pending'])

  if (!bookings || bookings.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No payable bookings found' }) }
  }

  // Build line items from bookings (gross up walker net price for client)
  const lineItems = bookings.map((b) => {
    const svc = b.services
    const isOvernight = b.end_date && b.end_date !== b.booking_date
    let unitAmount = grossUp(svc.price_cents)
    let quantity = 1
    if (isOvernight) {
      const nights = Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24))
      quantity = nights
    }
    const dateStr = new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return {
      price_data: {
        currency: 'gbp',
        unit_amount: unitAmount,
        product_data: {
          name: `${svc.name} — ${dateStr}`,
        },
      },
      quantity,
    }
  })

  // Compute totals: client pays gross, walker gets net, platform keeps difference
  const grossTotalCents = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0)
  const netTotalCents = bookings.reduce((sum, b) => {
    const isOvernight = b.end_date && b.end_date !== b.booking_date
    const nights = isOvernight ? Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24)) : 1
    return sum + b.services.price_cents * nights
  }, 0)
  const platformFeeCents = grossTotalCents - netTotalCents

  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: wp.stripe_account_id,
      },
    },
    success_url: `${siteUrl}/account/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/account/bookings?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    metadata: {
      payment_id,
      platform_fee_cents: platformFeeCents.toString(),
    },
  })

  // Update payment with session ID and fee, transition bookings to hold
  await adminSupabase
    .from('payments')
    .update({
      stripe_session_id: session.id,
      total_cents: grossTotalCents,
      platform_fee_cents: platformFeeCents,
    })
    .eq('id', payment_id)

  await adminSupabase
    .from('bookings')
    .update({ status: 'hold' })
    .eq('payment_id', payment_id)
    .in('status', ['approved', 'pending'])

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { url: session.url, sessionId: session.id } }),
  }
}
