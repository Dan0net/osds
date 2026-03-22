import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const sig = event.headers['stripe-signature']
  if (!sig) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing stripe-signature header' }) }
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }) }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const paymentId = session.metadata?.payment_id

    if (!paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing payment_id in session metadata' }) }
    }

    // Promote hold → confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('payment_id', paymentId)
      .in('status', ['hold', 'pending'])

    if (bookingError) {
      console.error('Failed to confirm bookings:', bookingError)
    }

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        receipt_url: session.payment_intent
          ? `https://dashboard.stripe.com/payments/${session.payment_intent}`
          : null,
      })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Failed to update payment:', paymentError)
    }
  }

  if (stripeEvent.type === 'checkout.session.expired') {
    const session = stripeEvent.data.object
    const paymentId = session.metadata?.payment_id

    if (paymentId) {
      // Release held slots — revert to approved so walker can resend
      await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('payment_id', paymentId)
        .eq('status', 'hold')

      await supabase
        .from('payments')
        .update({ status: 'awaiting_payment', stripe_session_id: null })
        .eq('id', paymentId)
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true }),
  }
}
