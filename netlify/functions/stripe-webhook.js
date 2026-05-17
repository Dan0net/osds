import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, esc, formatDateTime } from './lib/notify.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function syncRefund(refund) {
  // Locate the payment by payment_intent
  const paymentIntentId = typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id
  if (!paymentIntentId) return

  const { data: payment } = await supabase
    .from('payments')
    .select('id, total_cents')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (!payment) {
    console.error('Refund webhook: no payment matches PI', paymentIntentId)
    return
  }

  const bookingIds = typeof refund.metadata?.booking_ids === 'string' && refund.metadata.booking_ids
    ? refund.metadata.booking_ids.split(',').filter(Boolean)
    : null

  // Upsert refund row (idempotent on stripe_refund_id)
  await supabase
    .from('refunds')
    .upsert({
      payment_id: payment.id,
      stripe_refund_id: refund.id,
      amount_cents: refund.amount,
      status: refund.status,
      reason: refund.reason || null,
      booking_ids: bookingIds,
    }, { onConflict: 'stripe_refund_id' })

  // Recompute the payment's refunded_amount_cents from succeeded refunds
  const { data: succeeded } = await supabase
    .from('refunds')
    .select('amount_cents')
    .eq('payment_id', payment.id)
    .eq('status', 'succeeded')
  const refundedAmount = (succeeded || []).reduce((sum, r) => sum + r.amount_cents, 0)

  // Derive payment.status
  let nextStatus = 'paid'
  if (refundedAmount >= payment.total_cents) nextStatus = 'refunded'
  else if (refundedAmount > 0) nextStatus = 'partially_refunded'

  await supabase
    .from('payments')
    .update({ refunded_amount_cents: refundedAmount, status: nextStatus })
    .eq('id', payment.id)

  // If the refund succeeded and we know which bookings it covers, promote them
  if (refund.status === 'succeeded' && bookingIds && bookingIds.length > 0) {
    await supabase
      .from('bookings')
      .update({ status: 'refunded' })
      .in('id', bookingIds)
      .eq('status', 'cancelled')
  }
}

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

    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('payment_id', paymentId)
      .in('status', ['hold', 'pending'])

    if (bookingError) {
      console.error('Failed to confirm bookings:', bookingError)
    }

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntentId || null,
        receipt_url: paymentIntentId
          ? `https://dashboard.stripe.com/payments/${paymentIntentId}`
          : null,
      })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Failed to update payment:', paymentError)
    }

    const { data: paymentRow } = await supabase.from('payments').select('walker_id, client_id, total_cents').eq('id', paymentId).single()
    if (paymentRow) {
      const { data: walkerProfile } = await supabase.from('walker_profiles').select('user_id, business_name').eq('id', paymentRow.walker_id).single()
      const { data: clientUser } = await supabase.from('users').select('name').eq('id', paymentRow.client_id).single()
      const { data: paidBookings } = await supabase.from('bookings').select('id, booking_date, start_time, service_id, services(name)').eq('payment_id', paymentId).limit(1).single()
      const clientName = clientUser?.name || 'A client'
      const amount = `£${(paymentRow.total_cents / 100).toFixed(2)}`
      const svcName = paidBookings?.services?.name || 'booking'
      const when = paidBookings ? formatDateTime(paidBookings.booking_date, paidBookings.start_time) : ''
      if (walkerProfile) {
        const paymentLink = `/account/money/${paymentId}`
        const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
        await notify(supabase, {
          walkerId: paymentRow.walker_id,
          clientId: paymentRow.client_id,
          recipientUserId: walkerProfile.user_id,
          event: {
            type: 'payment_confirmed',
            title: 'Payment received',
            body: `${clientName} paid ${amount} for ${svcName}${when ? ` on ${when}` : ''}`,
            link: paymentLink,
            emailSubject: `Payment received — ${amount} from ${clientName}`,
            emailHtml: emailTemplate('Payment received', [
              `<strong>${esc(clientName)}</strong> has paid <strong>${esc(amount)}</strong> for <strong>${esc(svcName)}</strong>${when ? ` on ${esc(when)}` : ''}.`,
              'The booking is now confirmed.',
            ], 'View payment', `${siteUrl}${paymentLink}`),
          },
        })
      }
    }
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const pi = stripeEvent.data.object
    const paymentId = pi.metadata?.payment_id
    if (paymentId && pi.id) {
      await supabase
        .from('payments')
        .update({ stripe_payment_intent_id: pi.id })
        .eq('id', paymentId)
    }
  }

  if (stripeEvent.type === 'charge.refunded') {
    const charge = stripeEvent.data.object
    const refunds = charge.refunds?.data || []
    for (const refund of refunds) {
      await syncRefund(refund)
    }
  }

  if (stripeEvent.type === 'refund.updated' || stripeEvent.type === 'refund.created' || stripeEvent.type === 'refund.failed') {
    const refund = stripeEvent.data.object
    await syncRefund(refund)
  }

  if (stripeEvent.type === 'account.updated') {
    const account = stripeEvent.data.object
    const { error: accountError } = await supabase
      .from('walker_profiles')
      .update({ stripe_charges_enabled: !!account.charges_enabled })
      .eq('stripe_account_id', account.id)
    if (accountError) {
      console.error('Failed to sync stripe_charges_enabled:', accountError)
    }
  }

  if (stripeEvent.type === 'checkout.session.expired') {
    const session = stripeEvent.data.object
    const paymentId = session.metadata?.payment_id

    if (paymentId) {
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
