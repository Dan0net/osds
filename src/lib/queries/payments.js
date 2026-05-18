import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { apiFetch } from '../api'
import { walkerTakeFromPayment } from '../utils'
import { useRealtimeInvalidate } from './realtime'

export function useClientPayments(userId) {
  const enabled = !!userId
  const queryKey = ['payments', 'client', userId]
  useRealtimeInvalidate({ table: 'payments', filter: enabled ? `client_id=eq.${userId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, walker_profiles(business_name), bookings(services(name))')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useWalkerPayments(walkerProfileId) {
  const enabled = !!walkerProfileId
  const queryKey = ['payments', 'walker', walkerProfileId]
  useRealtimeInvalidate({ table: 'payments', filter: enabled ? `walker_id=eq.${walkerProfileId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, users!payments_client_id_fkey(name), bookings(services(name))')
        .eq('walker_id', walkerProfileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function usePayment(paymentId) {
  const enabled = !!paymentId
  const queryKey = ['payment', paymentId]
  useRealtimeInvalidate({ table: 'payments', filter: enabled ? `id=eq.${paymentId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, walker_profiles(slug, business_name, theme_color, user_id), users!payments_client_id_fkey(name, email)')
        .eq('id', paymentId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function usePaymentBookings(paymentId) {
  const enabled = !!paymentId
  const queryKey = ['payment-bookings', paymentId]
  useRealtimeInvalidate({ table: 'bookings', filter: enabled ? `payment_id=eq.${paymentId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services(name, price_cents, duration_minutes, service_type), pets(name, breed)')
        .eq('payment_id', paymentId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function usePaymentRefunds(paymentId) {
  const enabled = !!paymentId
  return useQuery({
    queryKey: ['payment-refunds', paymentId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

// Returns an array of payment ids the user has not yet seen the latest state of.
// Array (not Set) so it serializes cleanly into the IDB cache.
export function useUnreadPaymentIds(userId) {
  const enabled = !!userId
  return useQuery({
    queryKey: ['unread-payment-ids', userId],
    enabled,
    queryFn: async () => {
      const { data: payments } = await supabase.from('payments').select('id, updated_at')
      if (!payments || payments.length === 0) return []
      const { data: reads } = await supabase
        .from('payment_reads')
        .select('payment_id, last_seen_at')
        .eq('user_id', userId)
      const readMap = new Map((reads || []).map((r) => [r.payment_id, r.last_seen_at]))
      const unread = []
      for (const p of payments) {
        const lastSeen = readMap.get(p.id)
        if (!lastSeen || lastSeen < p.updated_at) unread.push(p.id)
      }
      return unread
    },
  })
}

export function usePayNowCheckout() {
  return useMutation({
    mutationFn: (paymentId) =>
      apiFetch('create-checkout', { method: 'POST', body: JSON.stringify({ payment_id: paymentId }) }),
  })
}

function usePaymentMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment'] })
      queryClient.invalidateQueries({ queryKey: ['unread-payment-ids'] })
    },
  })
}

export function useMarkPaymentRead(userId) {
  return usePaymentMutation(async (paymentId) => {
    if (!paymentId || !userId) return
    await supabase.from('payment_reads').upsert({
      payment_id: paymentId, user_id: userId, last_seen_at: new Date().toISOString(),
    })
    window.dispatchEvent(new Event('payments-read'))
  })
}

export function useMarkAllPaymentsRead(userId) {
  return usePaymentMutation(async (paymentIds) => {
    if (!userId || !paymentIds?.length) return
    const now = new Date().toISOString()
    const rows = paymentIds.map((id) => ({ payment_id: id, user_id: userId, last_seen_at: now }))
    await supabase.from('payment_reads').upsert(rows)
    window.dispatchEvent(new Event('payments-read'))
  })
}

export function useStripeDashboardLink() {
  return useMutation({
    mutationFn: () => apiFetch('stripe-dashboard-link', { method: 'POST' }),
  })
}

// Tracks new paid payments arriving for a walker via Realtime, emitting a
// "celebration" event once per new id. Returns { celebration, dismiss }.
export function usePaidCelebration(walkerProfileId) {
  const [celebration, setCelebration] = useState(null)
  const seenPaidIds = useRef(new Set())
  const queryClient = useQueryClient()

  // Seed the seen-set with the walker's existing paid payments so we don't
  // celebrate ones that were paid before this session.
  useEffect(() => {
    if (!walkerProfileId) return
    let cancelled = false
    supabase
      .from('payments')
      .select('id')
      .eq('walker_id', walkerProfileId)
      .eq('status', 'paid')
      .then(({ data }) => {
        if (cancelled) return
        for (const p of data || []) seenPaidIds.current.add(p.id)
      })
    return () => { cancelled = true }
  }, [walkerProfileId])

  // Subscribe to ALL payment changes for this user (any walker_id or client_id).
  // Realtime is broad here because the events feed into multiple caches; the
  // celebration filter happens locally.
  useEffect(() => {
    if (!walkerProfileId) return
    const channel = supabase
      .channel(`payments-celebration-${walkerProfileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          queryClient.invalidateQueries({ queryKey: ['unread-payment-ids'] })
          const row = payload.new
          if (
            row?.walker_id === walkerProfileId &&
            row?.status === 'paid' &&
            !seenPaidIds.current.has(row.id)
          ) {
            seenPaidIds.current.add(row.id)
            const { data } = await supabase
              .from('payments')
              .select('id, total_cents, platform_fee_cents, refunded_amount_cents, users!payments_client_id_fkey(name)')
              .eq('id', row.id)
              .maybeSingle()
            setCelebration({
              amountCents: walkerTakeFromPayment(data || row),
              counterpart: data?.users?.name || null,
            })
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [walkerProfileId, queryClient])

  return { celebration, dismiss: () => setCelebration(null) }
}

export function usePaymentsByIds(paymentIds) {
  const ids = (paymentIds || []).slice().sort()
  const enabled = ids.length > 0
  return useQuery({
    queryKey: ['payments-by-ids', ids],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, source, total_cents, platform_fee_cents, refunded_amount_cents, status, bookings(id, services(name))')
        .in('id', ids)
      if (error) throw error
      return data || []
    },
  })
}
