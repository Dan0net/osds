import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { grossUp } from './lib/pricing.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function htmlError(siteUrl, msg) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!doctype html><meta charset="utf-8"><title>Payment</title><body style="font:14px system-ui;padding:32px;max-width:480px;margin:0 auto;color:#374151"><h1 style="font-size:18px;margin:0 0 8px">Can't open this payment</h1><p>${msg}</p><p><a href="${siteUrl}/account/money" style="color:#4f46e5">Go to my payments →</a></p></body>`,
  }
}

export async function handler(event) {
  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  const paymentId = event.queryStringParameters?.payment_id
  if (!paymentId) return htmlError(siteUrl, 'Missing payment reference.')

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: payment } = await adminSupabase
    .from('payments')
    .select('id, status, walker_id, client_id, total_cents')
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment) return htmlError(siteUrl, 'Payment not found.')

  if (payment.status === 'paid' || payment.status === 'partially_refunded') {
    return {
      statusCode: 302,
      headers: { Location: `${siteUrl}/account/money/${paymentId}` },
    }
  }

  if (payment.status !== 'awaiting_payment') {
    return htmlError(siteUrl, `This payment is ${payment.status.replace('_', ' ')} and can't be paid right now.`)
  }

  const { data: wp } = await adminSupabase
    .from('walker_profiles')
    .select('stripe_account_id, stripe_charges_enabled')
    .eq('id', payment.walker_id)
    .single()

  if (!wp?.stripe_charges_enabled) {
    return htmlError(siteUrl, 'The walker has not finished Stripe onboarding.')
  }

  const { data: bookings } = await adminSupabase
    .from('bookings')
    .select('*, services(name, price_cents, duration_minutes, service_type)')
    .eq('payment_id', paymentId)
    .in('status', ['approved', 'pending', 'hold'])

  if (!bookings || bookings.length === 0) {
    return htmlError(siteUrl, 'No payable bookings on this payment.')
  }

  const lineItems = bookings.map((b) => {
    const svc = b.services
    const isOvernight = b.end_date && b.end_date !== b.booking_date
    const unitAmount = grossUp(svc.price_cents)
    const quantity = isOvernight
      ? Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24))
      : 1
    const dateStr = new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return {
      price_data: {
        currency: 'gbp',
        unit_amount: unitAmount,
        product_data: { name: `${svc.name} — ${dateStr}` },
      },
      quantity,
    }
  })

  const grossTotalCents = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0)
  const netTotalCents = bookings.reduce((sum, b) => {
    const isOvernight = b.end_date && b.end_date !== b.booking_date
    const nights = isOvernight ? Math.round((new Date(b.end_date) - new Date(b.booking_date)) / (1000 * 60 * 60 * 24)) : 1
    return sum + b.services.price_cents * nights
  }, 0)
  const platformFeeCents = grossTotalCents - netTotalCents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: wp.stripe_account_id },
    },
    success_url: `${siteUrl}/account/money/${paymentId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/account/money/${paymentId}?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: { payment_id: paymentId, platform_fee_cents: platformFeeCents.toString() },
  })

  await adminSupabase
    .from('payments')
    .update({
      stripe_session_id: session.id,
      total_cents: grossTotalCents,
      platform_fee_cents: platformFeeCents,
    })
    .eq('id', paymentId)

  await adminSupabase
    .from('bookings')
    .update({ status: 'hold' })
    .eq('payment_id', paymentId)
    .in('status', ['approved', 'pending', 'hold'])

  return {
    statusCode: 302,
    headers: { Location: session.url },
  }
}
