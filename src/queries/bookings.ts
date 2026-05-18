import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import { apiFetch } from '@/utils/functions'
import { useRealtimeInvalidate } from './realtime'

const CLIENT_SELECT = '*, services(name), pets(name), walker_profiles(slug, business_name, theme_color), payments(status, source)'
const WALKER_SELECT = '*, services(name), pets(name), payments(source), users!bookings_client_id_fkey(name, phone, postcode)'
const DETAIL_SELECT = `
  *,
  services(name, price_cents, duration_minutes, service_type),
  pets(name, breed, weight, notes),
  walker_profiles(slug, business_name, theme_color, user_id),
  payments(id, status, total_cents, platform_fee_cents, refunded_amount_cents, source),
  users!bookings_client_id_fkey(name, email, phone, postcode)
`

export function useClientBookings(clientId: string | undefined) {
  const enabled = !!clientId
  const queryKey = ['bookings', 'client', clientId] as const
  useRealtimeInvalidate({ table: 'bookings', filter: enabled ? `client_id=eq.${clientId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(CLIENT_SELECT)
        .eq('client_id', clientId!)
        .order('booking_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function useWalkerBookings(walkerProfileId: string | undefined) {
  const enabled = !!walkerProfileId
  const queryKey = ['bookings', 'walker', walkerProfileId] as const
  useRealtimeInvalidate({ table: 'bookings', filter: enabled ? `walker_id=eq.${walkerProfileId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(WALKER_SELECT)
        .eq('walker_id', walkerProfileId!)
        .order('booking_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

export function useBooking(bookingId: string | undefined) {
  const enabled = !!bookingId
  const queryKey = ['booking', bookingId] as const
  useRealtimeInvalidate({ table: 'bookings', filter: enabled ? `id=eq.${bookingId}` : null, queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(DETAIL_SELECT)
        .eq('id', bookingId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useBookingSiblings(paymentId: string | undefined) {
  return useQuery({
    queryKey: ['booking-siblings', paymentId] as const,
    enabled: !!paymentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('payment_id', paymentId!)
      if (error) throw error
      return data || []
    },
  })
}

function useBookingMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['booking'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment'] })
      queryClient.invalidateQueries({ queryKey: ['payment-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['payment-refunds'] })
    },
  })
}

export function useApproveBooking() {
  return useBookingMutation((params: { booking_id?: string; payment_id?: string }) =>
    apiFetch('approve-booking', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useDeclineBooking() {
  return useBookingMutation((params: { booking_id?: string; payment_id?: string }) =>
    apiFetch('decline-booking', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useCancelBooking() {
  return useBookingMutation((params: { booking_id?: string; payment_id?: string }) =>
    apiFetch('cancel-booking', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useRescheduleBooking() {
  return useBookingMutation((params: Record<string, unknown>) =>
    apiFetch('reschedule-booking', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useWalkerCreateBooking() {
  return useBookingMutation((params: Record<string, unknown>) =>
    apiFetch('walker-create-booking', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useCreateBookingRequest() {
  return useBookingMutation((params: Record<string, unknown>) =>
    apiFetch('create-booking-request', { method: 'POST', body: JSON.stringify(params) }),
  )
}
