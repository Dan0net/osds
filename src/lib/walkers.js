import { supabase } from './supabase'

const PAID_STATUSES = new Set(['confirmed', 'paid'])

// Returns [{ walker, totalBookings, lastBookingDate, totalSpendCents }]
// for this owner (client), sorted by most recently booked first.
export async function loadOwnerWalkers(ownerUserId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('walker_id, booking_date, walker_profiles(id, slug, business_name, theme_color, postcode, cover_url, created_at, users(name, avatar_url)), payments(total_cents, status)')
    .eq('client_id', ownerUserId)
    .order('booking_date', { ascending: false })

  if (error) return []

  const map = new Map()
  for (const row of data || []) {
    if (!row.walker_id || !row.walker_profiles) continue
    const w = map.get(row.walker_id) || {
      walker: row.walker_profiles, totalBookings: 0, lastBookingDate: null, totalSpendCents: 0,
    }
    w.totalBookings += 1
    if (!w.lastBookingDate || row.booking_date > w.lastBookingDate) w.lastBookingDate = row.booking_date
    if (row.payments && PAID_STATUSES.has(row.payments.status)) w.totalSpendCents += row.payments.total_cents || 0
    map.set(row.walker_id, w)
  }

  return [...map.values()].sort((a, b) => {
    if (a.lastBookingDate === b.lastBookingDate) return 0
    if (!a.lastBookingDate) return 1
    if (!b.lastBookingDate) return -1
    return a.lastBookingDate < b.lastBookingDate ? 1 : -1
  })
}
