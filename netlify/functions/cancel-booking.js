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

  const { booking_id, payment_id } = JSON.parse(event.body)
  if (!booking_id && !payment_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'booking_id or payment_id is required' }) }
  }

  // Determine which bookings to cancel
  let bookings
  if (payment_id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id, stripe_account_id)')
      .eq('payment_id', payment_id)

    if (error || !data || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No bookings found' }) }
    }
    bookings = data
  } else {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id, stripe_account_id)')
      .eq('id', booking_id)

    if (error || !data || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) }
    }
    bookings = data
  }

  // Verify ownership: must be walker or client
  const isWalker = bookings[0].walker_profiles.user_id === user.id
  const isClient = bookings[0].client_id === user.id
  if (!isWalker && !isClient) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not your booking to manage' }) }
  }

  const cancellableStatuses = ['requested', 'approved', 'hold', 'confirmed', 'pending']
  const toCancelIds = bookings
    .filter((b) => cancellableStatuses.includes(b.status))
    .map((b) => b.id)

  if (toCancelIds.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No cancellable bookings found' }) }
  }

  // Cancel the bookings
  await adminSupabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', toCancelIds)

  // Handle refund if payment was via Stripe and is paid
  const pId = bookings[0].payment_id
  if (pId) {
    const { data: payment } = await adminSupabase
      .from('payments')
      .select('*')
      .eq('id', pId)
      .single()

    if (payment && payment.status === 'paid' && payment.stripe_session_id) {
      // Check if all bookings in this payment are now cancelled
      const { data: remaining } = await adminSupabase
        .from('bookings')
        .select('id, status, service_id')
        .eq('payment_id', pId)

      const allCancelled = remaining.every((b) => b.status === 'cancelled' || b.status === 'refunded')
      const cancelledFromPaid = remaining.filter((b) => b.status === 'cancelled')

      try {
        // Retrieve the checkout session to get payment intent
        const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id)

        if (session.payment_intent) {
          if (allCancelled) {
            // Full refund
            await stripe.refunds.create({ payment_intent: session.payment_intent })
            await adminSupabase
              .from('payments')
              .update({ status: 'refunded' })
              .eq('id', pId)
            await adminSupabase
              .from('bookings')
              .update({ status: 'refunded' })
              .in('id', toCancelIds)
          } else if (cancelledFromPaid.length > 0 && !allCancelled) {
            // Partial refund: compute amount for cancelled bookings
            const cancelledServiceIds = cancelledFromPaid.map((b) => b.service_id)
            const { data: services } = await adminSupabase
              .from('services')
              .select('id, price_cents')
              .in('id', cancelledServiceIds)

            const refundCents = services.reduce((sum, s) => sum + grossUp(s.price_cents), 0)
            if (refundCents > 0) {
              await stripe.refunds.create({
                payment_intent: session.payment_intent,
                amount: refundCents,
              })
              await adminSupabase
                .from('payments')
                .update({ status: 'partially_refunded' })
                .eq('id', pId)
              await adminSupabase
                .from('bookings')
                .update({ status: 'refunded' })
                .in('id', toCancelIds)
            }
          }
        }
      } catch (err) {
        console.error('Refund error:', err.message)
        // Bookings still cancelled even if refund fails — manual intervention needed
      }
    }

    // If payment is hold/awaiting, just update payment status
    if (payment && (payment.status === 'awaiting_payment' || payment.status === 'pending_approval')) {
      const { data: remaining } = await adminSupabase
        .from('bookings')
        .select('id, status')
        .eq('payment_id', pId)

      const allCancelled = remaining.every((b) => b.status === 'cancelled' || b.status === 'declined')
      if (allCancelled) {
        await adminSupabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', pId)
      }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { cancelledIds: toCancelIds } }),
  }
}
