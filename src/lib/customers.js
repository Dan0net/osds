import { supabase } from './supabase'

const PAID_STATUSES = new Set(['confirmed', 'paid'])

// Returns [{ client, totalBookings, lastBookingDate, totalSpendCents, petCount }]
// for this walker, sorted by most recently booked first (customers without
// bookings go to the bottom in insertion order).
// Customer set = clients in walker's bookings ∪ users this walker has successfully invited.
export async function loadWalkerCustomers(walkerProfileId) {
  const [bookingsRes, invitesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('client_id, booking_date, users(id, name, email, avatar_url), payments(total_cents, status)')
      .eq('walker_id', walkerProfileId)
      .order('booking_date', { ascending: false }),
    supabase
      .from('customer_invites')
      .select('invited_user_id, users(id, name, email, avatar_url)')
      .eq('walker_id', walkerProfileId)
      .not('invited_user_id', 'is', null),
  ])

  const map = new Map()
  for (const row of bookingsRes.data || []) {
    if (!row.client_id || !row.users) continue
    const c = map.get(row.client_id) || {
      client: row.users, totalBookings: 0, lastBookingDate: null, totalSpendCents: 0, petCount: 0,
    }
    c.totalBookings += 1
    if (!c.lastBookingDate || row.booking_date > c.lastBookingDate) c.lastBookingDate = row.booking_date
    if (row.payments && PAID_STATUSES.has(row.payments.status)) c.totalSpendCents += row.payments.total_cents || 0
    map.set(row.client_id, c)
  }
  for (const row of invitesRes.data || []) {
    if (!row.invited_user_id || !row.users || map.has(row.invited_user_id)) continue
    map.set(row.invited_user_id, {
      client: row.users, totalBookings: 0, lastBookingDate: null, totalSpendCents: 0, petCount: 0,
    })
  }

  const userIds = [...map.keys()]
  if (userIds.length > 0) {
    const { data: pets } = await supabase
      .from('pets')
      .select('user_id')
      .in('user_id', userIds)
    for (const p of pets || []) {
      const c = map.get(p.user_id)
      if (c) c.petCount += 1
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.lastBookingDate === b.lastBookingDate) return 0
    if (!a.lastBookingDate) return 1
    if (!b.lastBookingDate) return -1
    return a.lastBookingDate < b.lastBookingDate ? 1 : -1
  })
}
