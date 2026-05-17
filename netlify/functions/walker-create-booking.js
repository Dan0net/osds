import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { notify, emailTemplate, esc, formatSlots, bookingsListHtml } from './lib/notify.js'
import { slotNetCents, grossUp } from './lib/pricing.js'

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

  // Verify walker
  const { data: wp } = await supabase
    .from('walker_profiles')
    .select('id, stripe_account_id, stripe_charges_enabled, business_name')
    .eq('user_id', user.id)
    .single()

  if (!wp) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not a walker' }) }
  }

  const { client_id, slots, pet_id, pet_ids, mode } = JSON.parse(event.body)
  // mode: 'cash' or 'send_link'
  // pet_ids: optional uuid[] of pets attached to each booking. pet_id is the
  // back-compat single pet — if pet_ids is set, pet_id is the first element.
  const finalPetIds = Array.isArray(pet_ids) && pet_ids.length > 0
    ? pet_ids
    : (pet_id ? [pet_id] : [])
  const primaryPetId = finalPetIds[0] || null

  if (!client_id || !slots || !Array.isArray(slots) || slots.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'client_id and slots are required' }) }
  }

  if (!['cash', 'send_link'].includes(mode)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'mode must be cash or send_link' }) }
  }

  if (mode === 'send_link' && !wp.stripe_charges_enabled) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Finish Stripe onboarding before sending payment links' }) }
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
    .select('id, price_cents, duration_minutes, service_type, name, active, holiday_rate_cents, extra_pet_rate_cents, blocks_slot')
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

  const petCount = finalPetIds.length || 1

  function netForSlot(slot) {
    const svc = serviceMap[slot.serviceId]
    const nights = slot.isOvernight && slot.endDate
      ? Math.round((new Date(slot.endDate) - new Date(slot.date)) / (1000 * 60 * 60 * 24))
      : 1
    return slotNetCents(svc, {
      petCount,
      isHoliday: !!slot.isHoliday,
      isOvernight: !!slot.isOvernight,
      nights,
    })
  }

  // Calculate total from server-side prices (net = walker's price)
  const netTotalCents = slots.reduce((sum, slot) => sum + netForSlot(slot), 0)

  const grossTotalCents = grossUp(netTotalCents)
  const platformFeeCents = grossTotalCents - netTotalCents

  const isCash = mode === 'cash'

  // Create payment
  const { data: payment, error: payError } = await adminSupabase
    .from('payments')
    .insert({
      walker_id: wp.id,
      client_id,
      total_cents: isCash ? netTotalCents : grossTotalCents,
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
      pet_id: primaryPetId,
      pet_ids: finalPetIds.length > 0 ? finalPetIds : null,
      booking_date: slot.date,
      start_time: slot.time,
      end_time: slot.endTime || null,
      end_date: slot.endDate || null,
      capacity: 1,
      status: bookingStatus,
      is_holiday: !!slot.isHoliday,
      blocks_slot: svc.blocks_slot,
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
      const nights = isOvernight
        ? Math.round((new Date(slot.endDate) - new Date(slot.date)) / (1000 * 60 * 60 * 24))
        : 1
      // Per-unit net (one-night equivalent for overnights, full slot for standard)
      // so Stripe's quantity stays meaningful.
      const perUnitNet = slotNetCents(svc, {
        petCount,
        isHoliday: !!slot.isHoliday,
        isOvernight: false, // ignore multi-night here; quantity carries it
        nights: 1,
      })
      const dateStr = new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return {
        price_data: {
          currency: 'gbp',
          unit_amount: grossUp(perUnitNet),
          product_data: { name: `${svc.name} — ${dateStr}` },
        },
        quantity: isOvernight ? nights : 1,
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
      success_url: `${siteUrl}/account/money/${payment.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/account/money/${payment.id}?payment=cancelled`,
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

  // Notify client
  const serviceNames = [...new Set(slots.map((s) => serviceMap[s.serviceId]?.name || 'a service'))].join(', ')
  const when = formatSlots(slots)

  const emailRows = slots.map((slot) => ({
    serviceName: serviceMap[slot.serviceId]?.name,
    date: slot.date,
    time: slot.time,
    endTime: slot.endTime,
    endDate: slot.endDate,
    isOvernight: !!slot.isOvernight,
    grossCents: grossUp(netForSlot(slot)),
  }))
  const bookingsTable = bookingsListHtml(emailRows)

  if (isCash) {
    await notify(adminSupabase, {
      walkerId: wp.id,
      clientId: client_id,
      recipientUserId: client_id,
      event: {
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        body: `${wp.business_name} booked ${serviceNames} for you on ${when}`,
        link: `/account/payments/${payment.id}`,
        emailSubject: `Booking confirmed with ${wp.business_name}`,
        emailHtml: emailTemplate('Booking confirmed', [
          `<strong>${esc(wp.business_name)}</strong> has booked the following for you:`,
          bookingsTable,
          'Your booking is confirmed — pay in cash on arrival.',
        ], 'View bookings', 'https://onestopdog.shop/account/bookings'),
      },
    })
  } else {
    await notify(adminSupabase, {
      walkerId: wp.id,
      clientId: client_id,
      recipientUserId: client_id,
      event: {
        type: 'booking_payment_link',
        title: 'Payment requested',
        body: `${wp.business_name} requests payment for ${serviceNames} on ${when}`,
        link: `/account/payments/${payment.id}`,
        emailSubject: `Payment requested from ${wp.business_name}`,
        emailHtml: emailTemplate('Payment requested', [
          `<strong>${esc(wp.business_name)}</strong> has booked the following for you:`,
          bookingsTable,
          'Tap below to complete payment securely on Stripe — you don\'t need to sign in first.',
        ], 'Pay now', checkoutUrl),
      },
    })
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
