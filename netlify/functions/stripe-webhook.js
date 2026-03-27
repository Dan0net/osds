import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate } from './lib/notify.js'

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

    // Notify walker of payment
    const { data: paymentRow } = await supabase.from('payments').select('walker_id, client_id, total_cents').eq('id', paymentId).single()
    if (paymentRow) {
      const { data: walkerProfile } = await supabase.from('walker_profiles').select('user_id, business_name').eq('id', paymentRow.walker_id).single()
      const { data: clientUser } = await supabase.from('users').select('name').eq('id', paymentRow.client_id).single()
      const clientName = clientUser?.name || 'A client'
      const amount = `£${(paymentRow.total_cents / 100).toFixed(2)}`
      if (walkerProfile) {
        notify(supabase, walkerProfile.user_id, {
          type: 'payment_confirmed',
          title: 'Payment received',
          body: `${clientName} paid ${amount}`,
          link: '/account/payments',
          emailSubject: `Payment received — ${amount} from ${clientName}`,
          emailHtml: emailTemplate('Payment received', [
            `<strong>${clientName}</strong> has paid <strong>${amount}</strong> for their booking.`,
            'The booking is now confirmed.',
          ], 'View payments', `${process.env.SITE_URL || 'https://onestopdog.shop'}/account/payments`),
        })
      }
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
