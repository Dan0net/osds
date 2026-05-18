import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { apiFetch } from '../functions'

const PAID_STATUSES = new Set(['confirmed', 'paid'])

async function fetchWalkerCustomers(walkerProfileId) {
  const [bookingsRes, invitesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('client_id, booking_date, users(id, name, email, phone, postcode, avatar_url, created_at), payments(total_cents, status)')
      .eq('walker_id', walkerProfileId)
      .order('booking_date', { ascending: false }),
    supabase
      .from('customer_invites')
      .select('invited_user_id, users(id, name, email, phone, postcode, avatar_url, created_at)')
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
    const { data: pets } = await supabase.from('pets').select('user_id').in('user_id', userIds)
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

export function useWalkerCustomers(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['customers', walkerProfileId],
    enabled,
    queryFn: () => fetchWalkerCustomers(walkerProfileId),
  })
}

export function useCustomerDetail(walkerProfileId, clientId) {
  const enabled = !!walkerProfileId && !!clientId
  return useQuery({
    queryKey: ['customer', walkerProfileId, clientId],
    enabled,
    queryFn: async () => {
      const [bookingsRes, userRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, services(name), pets(*), payments(source), users:client_id(id, name, email, phone, postcode, avatar_url)')
          .eq('walker_id', walkerProfileId)
          .eq('client_id', clientId)
          .order('booking_date', { ascending: false }),
        supabase
          .from('users')
          .select('id, name, email, phone, postcode, avatar_url')
          .eq('id', clientId)
          .maybeSingle(),
      ])
      const bookings = bookingsRes.data || []
      const client = bookings[0]?.users || userRes.data || null
      return { client, bookings }
    },
  })
}

export function useInviteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params) => apiFetch('invite-customer', { method: 'POST', body: JSON.stringify(params) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useAddCustomerWithPets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ owner, pets }) => {
      const { data, error } = await apiFetch('invite-customer', {
        method: 'POST', body: JSON.stringify(owner),
      })
      if (error) return { error }
      let insertedPets = []
      if (data?.user?.id && pets?.length) {
        const rows = pets.map((p) => {
          const { __tempId, id, ...rest } = p
          return { ...rest, user_id: data.user.id }
        })
        const { data: petRows, error: petError } = await supabase.from('pets').insert(rows).select()
        if (petError) return { error: `Customer was added, but pets failed to save: ${petError.message}`, data }
        insertedPets = petRows || []
      }
      return { data, pets: insertedPets }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['pets'] })
    },
  })
}
