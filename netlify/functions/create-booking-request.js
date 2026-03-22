import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify auth
  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Create authenticated client so RLS sees auth.uid()
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const body = JSON.parse(event.body)
  const { walker_id, slots, pet_id } = body

  if (!walker_id || !slots || !Array.isArray(slots) || slots.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'walker_id and slots are required' }) }
  }

  // Verify walker exists
  const { data: walker, error: walkerError } = await supabase
    .from('walker_profiles')
    .select('id, user_id')
    .eq('id', walker_id)
    .single()

  if (walkerError || !walker) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Walker not found' }) }
  }

  // Cannot book yourself
  if (walker.user_id === user.id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot book your own services' }) }
  }

  // Verify all services exist and are active
  const serviceIds = [...new Set(slots.map((s) => s.serviceId))]
  const { data: services } = await supabase
    .from('services')
    .select('id, price_cents, duration_minutes, service_type, active')
    .in('id', serviceIds)
    .eq('walker_id', walker_id)

  const serviceMap = {}
  for (const svc of (services || [])) {
    if (!svc.active) {
      return { statusCode: 400, body: JSON.stringify({ error: `Service ${svc.id} is not active` }) }
    }
    serviceMap[svc.id] = svc
  }

  if (Object.keys(serviceMap).length !== serviceIds.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'One or more services not found' }) }
  }

  // Verify pet belongs to user (if provided)
  if (pet_id) {
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', pet_id)
      .eq('user_id', user.id)
      .single()

    if (petError || !pet) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Pet not found or not yours' }) }
    }
  }

  // Server-side availability check for each slot
  const activeStatuses = ['requested', 'approved', 'hold', 'confirmed', 'pending']

  for (const slot of slots) {
    const svc = serviceMap[slot.serviceId]
    if (!svc) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid service in slot' }) }
    }

    // Check for blocked dates
    const { data: blocked } = await supabase
      .from('blocked_dates')
      .select('id')
      .eq('walker_id', walker_id)
      .eq('date', slot.date)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return { statusCode: 400, body: JSON.stringify({ error: `Date ${slot.date} is blocked` }) }
    }

    // Check for conflicting bookings (capacity check)
    if (!slot.isOvernight) {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, capacity')
        .eq('walker_id', walker_id)
        .eq('booking_date', slot.date)
        .in('status', activeStatuses)

      const [slotH, slotM] = slot.time.split(':').map(Number)
      const slotStartMin = slotH * 60 + slotM
      const slotEndMin = slotStartMin + svc.duration_minutes

      for (const bk of (existing || [])) {
        if (bk.end_date && bk.end_date !== bk.booking_date) continue
        const [bkH, bkM] = bk.start_time.split(':').map(Number)
        const bkStartMin = bkH * 60 + bkM
        let bkEndMin = bkStartMin + 30
        if (bk.end_time) {
          const [bkEH, bkEM] = bk.end_time.split(':').map(Number)
          bkEndMin = bkEH * 60 + bkEM
        }

        // Check overlap
        if (slotStartMin < bkEndMin && slotEndMin > bkStartMin) {
          return { statusCode: 409, body: JSON.stringify({ error: `Slot ${slot.date} ${slot.time} is no longer available` }) }
        }
      }
    }
  }

  // Create bookings
  const bookingIds = []
  const batchId = slots.length > 1 ? crypto.randomUUID() : null

  for (const slot of slots) {
    const svc = serviceMap[slot.serviceId]
    const bookingData = {
      walker_id,
      client_id: user.id,
      batch_id: batchId,
      booking_date: slot.date,
      start_time: slot.time,
      end_time: slot.endTime || null,
      end_date: slot.endDate || null,
      capacity: 1,
      status: 'requested',
    }

    if (slot.isOvernight) {
      bookingData.end_date = slot.endDate
      bookingData.end_time = slot.endTime
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single()

    if (bookingError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create booking: ' + bookingError.message }) }
    }

    bookingIds.push(booking.id)

    // Create booking_item
    const itemData = {
      booking_id: booking.id,
      service_id: slot.serviceId,
      pet_id: pet_id || null,
      pet_details: null,
    }

    const { error: itemError } = await supabase
      .from('booking_items')
      .insert(itemData)

    if (itemError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create booking item: ' + itemError.message }) }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { bookingIds } }),
  }
}
