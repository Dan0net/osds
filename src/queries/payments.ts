import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { apiFetch } from '@/utils/functions'
import { walkerTakeFromPayment } from '@/utils/pricing'
import { useRealtimeInvalidate } from './realtime'

type Celebration = { amountCents: number; counterpart: string | null } | null

const paymentChildKey = (p: any) => {
  const id = p?.new?.id || p?.old?.id
  return id ? (['payment', id] as const) : null
}

export function useClientPayments(userId: string | undefined) {
  const enabled = !!userId
  const queryKey = ['payments', 'client', userId] as const
  useRealtimeInvalidate({ table: 'payments', filter: enabled ? `client_id=eq.${userId}` : null, queryKey, enabled, childKey: paymentChildKey })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, walker_profiles(business_name), bookings(services(name))')
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useWalkerPayments(walkerProfileId: string | undefined) {
  const enabled = !!walkerProfileId
  const queryKey = ['payments', 'walker', walkerProfileId] as const
  useRealtimeInvalidate({ table: 'payments', filter: enabled ? `walker_id=eq.${walkerProfileId}` : null, queryKey, enabled, childKey: paymentChildKey })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, users!payments_client_id_fkey(name), bookings(services(name))')
        .eq('walker_id', walkerProfileId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function usePayment(paymentId: string | undefined) {
  const enabled = !!paymentId
  const queryKey = ['payment', paymentId] as const
  useRealtimeInvalidate({ table: 'payments', queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, walker_profiles(slug, business_name, theme_color, user_id), users!payments_client_id_fkey(name, email)')
        .eq('id', paymentId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function usePaymentBookings(paymentId: string | undefined) {
  const enabled = !!paymentId
  const queryKey = ['payment-bookings', paymentId] as const
  useRealtimeInvalidate({ table: 'bookings', filter: enabled ? `payment_id=eq.${paymentId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services(name, price_cents, duration_minutes, service_type), pets(name, breed)')
        .eq('payment_id', paymentId!)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function usePaymentRefunds(paymentId: string | undefined) {
  const enabled = !!paymentId
  return useQuery({
    queryKey: ['payment-refunds', paymentId] as const,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .eq('payment_id', paymentId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function useUnreadPaymentIds(userId: string | undefined) {
  const enabled = !!userId
  const queryKey = ['unread-payment-ids', userId] as const
  useRealtimeInvalidate({ table: 'payments', queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_payment_ids')
      if (error) throw error
      return (data || []).map((r) => r.payment_id)
    },
  })
}

export function usePayNowCheckout() {
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch('create-checkout', { method: 'POST', body: JSON.stringify({ payment_id: paymentId }) }),
  })
}

export function useMarkPaymentRead(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (!paymentId || !userId) return
      await supabase.from('payment_reads').upsert({
        payment_id: paymentId, user_id: userId, last_seen_at: new Date().toISOString(),
      })
    },
    onMutate: (paymentId: string) => {
      queryClient.setQueryData<string[]>(['unread-payment-ids', userId], (old) => {
        if (!Array.isArray(old)) return old
        return old.filter((id) => id !== paymentId)
      })
    },
  })
}

export function useMarkAllPaymentsRead(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentIds: string[]) => {
      if (!userId || !paymentIds?.length) return
      const now = new Date().toISOString()
      const rows = paymentIds.map((id) => ({ payment_id: id, user_id: userId, last_seen_at: now }))
      await supabase.from('payment_reads').upsert(rows)
    },
    onMutate: (paymentIds: string[]) => {
      queryClient.setQueryData<string[]>(['unread-payment-ids', userId], (old) => {
        if (!Array.isArray(old)) return old
        const set = new Set(paymentIds)
        return old.filter((id) => !set.has(id))
      })
    },
  })
}

export function useStripeDashboardLink() {
  return useMutation({
    mutationFn: () => apiFetch('stripe-dashboard-link', { method: 'POST' }),
  })
}

export function usePaidCelebration(walkerProfileId: string | undefined) {
  const [celebration, setCelebration] = useState<Celebration>(null)
  const seenPaidIds = useRef(new Set<string>())

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

  useEffect(() => {
    if (!walkerProfileId) return
    const channel = supabase
      .channel(`payments-celebration-${walkerProfileId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'payments', filter: `walker_id=eq.${walkerProfileId}` },
        async (payload: any) => {
          const row = payload.new
          if (row?.status !== 'paid' || seenPaidIds.current.has(row.id)) return
          seenPaidIds.current.add(row.id)
          const { data } = await supabase
            .from('payments')
            .select('id, total_cents, platform_fee_cents, refunded_amount_cents, users!payments_client_id_fkey(name)')
            .eq('id', row.id)
            .maybeSingle()
          setCelebration({
            amountCents: walkerTakeFromPayment(data || row),
            counterpart: (data?.users as any)?.name || null,
          })
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [walkerProfileId])

  return { celebration, dismiss: () => setCelebration(null) }
}

export function usePaymentsByIds(paymentIds: string[] | undefined) {
  const ids = (paymentIds || []).slice().sort()
  const enabled = ids.length > 0
  return useQuery({
    queryKey: ['payments-by-ids', ids] as const,
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
