import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, esc, formatDateTime } from './lib/notify.js'
import { clientPriceCents } from './lib/pricing.js'
import { recomputePaymentTotals } from './lib/payment-totals.js'

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

  // Determine which bookings are in scope
  let scopeBookings
  if (payment_id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id, stripe_account_id), services(price_cents)')
      .eq('payment_id', payment_id)
    if (error || !data || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No bookings found' }) }
    }
    scopeBookings = data
  } else {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, walker_profiles!inner(user_id, stripe_account_id), services(price_cents)')
      .eq('id', booking_id)
    if (error || !data || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) }
    }
    scopeBookings = data
  }

  const isWalker = scopeBookings[0].walker_profiles.user_id === user.id
  const isClient = scopeBookings[0].client_id === user.id
  if (!isWalker && !isClient) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not your booking to manage' }) }
  }

  const CANCELLABLE = ['requested', 'approved', 'hold', 'confirmed', 'pending']
  const toCancel = scopeBookings.filter((b) => CANCELLABLE.includes(b.status))
  if (toCancel.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No cancellable bookings found' }) }
  }
  const toCancelIds = toCancel.map((b) => b.id)

  // Load the payment row (may be null for orphaned bookings)
  const pId = toCancel[0].payment_id
  let payment = null
  if (pId) {
    const { data } = await adminSupabase.from('payments').select('*').eq('id', pId).single()
    payment = data
  }

  const scope = payment_id ? 'payment' : 'booking'

  // ---- Paid path: Stripe refund first, then mark bookings cancelled. ----
  // Includes 'partially_refunded' so subsequent cancels on a multi-booking
  // payment still refund the remaining balance instead of silently no-op'ing.
  if (payment && (payment.status === 'paid' || payment.status === 'partially_refunded')) {
    // Resolve payment intent: prefer cached, fall back to session lookup
    let paymentIntentId = payment.stripe_payment_intent_id
    if (!paymentIntentId && payment.stripe_session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id)
        paymentIntentId = session.payment_intent
        if (paymentIntentId) {
          await adminSupabase.from('payments').update({ stripe_payment_intent_id: paymentIntentId }).eq('id', payment.id)
        }
      } catch (err) {
        return { statusCode: 502, body: JSON.stringify({ error: `Could not resolve Stripe session: ${err.message}` }) }
      }
    }
    if (!paymentIntentId) {
      return { statusCode: 422, body: JSON.stringify({ error: 'Payment has no Stripe payment intent on record; cannot refund.' }) }
    }

    // How much to refund: gross-up of cancelled bookings' net prices
    const refundCents = toCancel.reduce((sum, b) => sum + clientPriceCents(b.services?.price_cents || 0), 0)
    const unrefundedBalance = (payment.total_cents || 0) - (payment.refunded_amount_cents || 0)

    // If this would consume the remaining balance, omit `amount` for a clean full refund
    const refundParams = {
      payment_intent: paymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
      metadata: {
        payment_id: payment.id,
        scope,
        booking_ids: toCancelIds.join(','),
      },
    }
    if (refundCents < unrefundedBalance) {
      refundParams.amount = refundCents
    }

    try {
      await stripe.refunds.create(refundParams)
    } catch (err) {
      return { statusCode: 502, body: JSON.stringify({ error: `Stripe refund failed: ${err.message}` }) }
    }

    // Stripe accepted — mark bookings cancelled. Webhook will promote to 'refunded'
    // and update payment.refunded_amount_cents + payment.status.
    await adminSupabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', toCancelIds)
  }
  // ---- Awaiting payment / pending approval: no money to move; just recompute totals. ----
  else if (payment && (payment.status === 'awaiting_payment' || payment.status === 'pending_approval')) {
    await adminSupabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', toCancelIds)

    const totals = await recomputePaymentTotals(adminSupabase, payment.id)
    const update = { total_cents: totals.total_cents, platform_fee_cents: totals.platform_fee_cents }
    if (totals.total_cents === 0) update.status = 'cancelled'
    await adminSupabase.from('payments').update(update).eq('id', payment.id)
  }
  // ---- Cash or no payment row: just mark cancelled. ----
  else {
    await adminSupabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', toCancelIds)
    if (payment && payment.source === 'cash') {
      const { data: active } = await adminSupabase
        .from('bookings')
        .select('id')
        .eq('payment_id', payment.id)
        .not('status', 'in', '(cancelled,declined,refunded)')
      if (!active || active.length === 0) {
        await adminSupabase.from('payments').update({ status: 'cancelled' }).eq('id', payment.id)
      }
    }
  }

  // Notify the other party (one notification per call, even for bulk cancels)
  const otherPartyId = isWalker ? toCancel[0].client_id : toCancel[0].walker_profiles.user_id
  const { data: cancelSvc } = await adminSupabase.from('services').select('name').eq('id', toCancel[0].service_id).single()
  const cancelSvcName = cancelSvc?.name || 'Booking'
  const cancelWhen = formatDateTime(toCancel[0].booking_date, toCancel[0].start_time)
  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  await notify(adminSupabase, {
    walkerId: toCancel[0].walker_id,
    clientId: toCancel[0].client_id,
    recipientUserId: otherPartyId,
    event: {
      type: 'booking_cancelled',
      title: 'Booking cancelled',
      body: `${cancelSvcName} on ${cancelWhen} has been cancelled`,
      link: pId ? `/account/money/${pId}` : `/account/bookings/${toCancel[0].id}`,
      emailSubject: `Booking cancelled — ${cancelSvcName} on ${cancelWhen}`,
      emailHtml: emailTemplate('Booking cancelled', [
        `<strong>${esc(cancelSvcName)}</strong> on ${esc(cancelWhen)} has been cancelled.`,
        'Check your bookings page for details.',
      ], 'View payment', pId ? `${siteUrl}/account/money/${pId}` : `${siteUrl}/account/bookings/${toCancel[0].id}`),
    },
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { cancelledIds: toCancelIds } }),
  }
}
