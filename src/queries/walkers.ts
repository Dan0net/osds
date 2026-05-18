import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'

const PAID_STATUSES = new Set(['confirmed', 'paid'])

async function fetchOwnerWalkers(ownerUserId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('walker_id, booking_date, walker_profiles(id, slug, business_name, theme_color, postcode, cover_url, created_at, users(name, avatar_url)), payments(total_cents, status)')
    .eq('client_id', ownerUserId)
    .order('booking_date', { ascending: false })
  if (error) return []

  const map = new Map<string, any>()
  for (const row of data || []) {
    if (!row.walker_id || !row.walker_profiles) continue
    const w = map.get(row.walker_id) || {
      walker: row.walker_profiles, totalBookings: 0, lastBookingDate: null, totalSpendCents: 0,
    }
    w.totalBookings += 1
    if (!w.lastBookingDate || row.booking_date > w.lastBookingDate) w.lastBookingDate = row.booking_date
    if (row.payments && PAID_STATUSES.has((row.payments as any).status)) w.totalSpendCents += (row.payments as any).total_cents || 0
    map.set(row.walker_id, w)
  }

  return [...map.values()].sort((a, b) => {
    if (a.lastBookingDate === b.lastBookingDate) return 0
    if (!a.lastBookingDate) return 1
    if (!b.lastBookingDate) return -1
    return a.lastBookingDate < b.lastBookingDate ? 1 : -1
  })
}

export function useOwnerWalkers(ownerUserId: string | undefined) {
  return useQuery({
    queryKey: ['owner-walkers', ownerUserId] as const,
    enabled: !!ownerUserId,
    queryFn: () => fetchOwnerWalkers(ownerUserId!),
  })
}

export function useWalker(walkerId: string | undefined) {
  return useQuery({
    queryKey: ['walker', walkerId] as const,
    enabled: !!walkerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walker_profiles')
        .select('*, users(name, avatar_url)')
        .eq('id', walkerId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useOwnerBookingsForWalker(walkerId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: ['owner-walker-bookings', walkerId, clientId] as const,
    enabled: !!walkerId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, status, services(name), payments(source, status)')
        .eq('walker_id', walkerId!)
        .eq('client_id', clientId!)
        .order('booking_date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}
