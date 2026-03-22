import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const PLATFORM_FEE_RATE = 0.05

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

  // Verify walker
  const { data: wp } = await supabase
    .from('walker_profiles')
    .select('id, stripe_account_id, business_name')
    .eq('user_id', user.id)
    .single()

  if (!wp) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not a walker' }) }
  }

  const { client_id, slots, pet_id, mode } = JSON.parse(event.body)
  // mode: 'cash' or 'send_link'

  if (!client_id || !slots || !Array.isArray(slots) || slots.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'client_id and slots are required' }) }
  }

  if (!['cash', 'send_link'].includes(mode)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'mode must be cash or send_link' }) }
  }

  if (mode === 'send_link' && !wp.stripe_account_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Connect Stripe first to send payment links' }) }
  }

  // Verify client exists
  const { data: client } = await adminSupabase
    .from('users')
    .select('id, email, name')
    .eq('id', client_id)
    .single()

  if (!client) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Client not found' }) }
  }

  // Verify services
  const serviceIds = [...new Set(slots.map((s) => s.serviceId))]
  const { data: services } = await adminSupabase
    .from('services')
    .select('id, price_cents, duration_minutes, service_type, name, active')
    .in('id', serviceIds)
    .eq('walker_id', wp.id)

  const serviceMap = {}
  for (const svc of (services || [])) {
    if (!svc.active) {
      return { statusCode: 400, body: JSON.stringify({ error: `Service ${svc.name} is not active` }) }
    }
    serviceMap[svc.id] = svc
  }

  if (Object.keys(serviceMap).length !== serviceIds.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'One or more services not found' }) }
  }

  // Calculate total from server-side prices
  const totalCents = slots.reduce((sum, slot) => {
    const svc = serviceMap[slot.serviceId]
    if (slot.isOvernight && slot.endDate) {
      const nights = Math.round((new Date(slot.endDate) - new Date(slot.date)) / (1000 * 60 * 60 * 24))
      return sum + svc.price_cents * nights
    }
    return sum + svc.price_cents
  }, 0)

  const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_RATE)

  const isCash = mode === 'cash'

  // Create payment
  const { data: payment, error: payError } = await adminSupabase
    .from('payments')
    .insert({
      walker_id: wp.id,
      client_id,
      total_cents: totalCents,
      platform_fee_cents: isCash ? 0 : platformFeeCents,
      status: isCash ? 'paid' : 'awaiting_payment',
      source: isCash ? 'cash' : 'stripe',
    })
    .select('id')
    .single()

  if (payError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create payment' }) }
  }

  // Create bookings
  const bookingStatus = isCash ? 'confirmed' : 'pending'
  const bookingIds = []

  for (const slot of slots) {
    const svc = serviceMap[slot.serviceId]
    const bookingData = {
      walker_id: wp.id,
      client_id,
      payment_id: payment.id,
      service_id: slot.serviceId,
      pet_id: pet_id || null,
      booking_date: slot.date,
      start_time: slot.time,
      end_time: slot.endTime || null,
      end_date: slot.endDate || null,
      capacity: 1,
      status: bookingStatus,
    }

    const { data: booking, error: bkErr } = await adminSupabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single()

    if (bkErr) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create booking' }) }
    }
    bookingIds.push(booking.id)
  }

  // If send_link mode, create checkout session
  let checkoutUrl = null
  if (!isCash) {
    const lineItems = slots.map((slot) => {
      const svc = serviceMap[slot.serviceId]
      const isOvernight = slot.isOvernight && slot.endDate
      let quantity = 1
      if (isOvernight) {
        quantity = Math.round((new Date(slot.endDate) - new Date(slot.date)) / (1000 * 60 * 60 * 24))
      }
      const dateStr = new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return {
        price_data: {
          currency: 'gbp',
          unit_amount: svc.price_cents,
          product_data: { name: `${svc.name} — ${dateStr}` },
        },
        quantity,
      }
    })

    const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: wp.stripe_account_id },
      },
      success_url: `${siteUrl}/account/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/account/bookings?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        payment_id: payment.id,
        platform_fee_cents: platformFeeCents.toString(),
      },
    })

    await adminSupabase
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', payment.id)

    checkoutUrl = session.url
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        bookingIds,
        paymentId: payment.id,
        checkoutUrl,
      },
    }),
  }
}
