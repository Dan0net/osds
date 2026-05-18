import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import { apiFetch } from '@/utils/functions'
import type { Database } from '@/types/database'

type UserRow = Database['public']['Tables']['users']['Row']
type WalkerProfileRow = Database['public']['Tables']['walker_profiles']['Row']

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId] as const,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useWalkerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['walker-profile', userId] as const,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walker_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function useProfileMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.invalidateQueries({ queryKey: ['walker-profile'] })
    },
  })
}

export function useUpdateUserProfile(userId: string | undefined) {
  return useProfileMutation(async (patch: Partial<UserRow>) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useUpdateWalkerProfile(walkerProfileId: string | undefined) {
  return useProfileMutation(async (patch: Partial<WalkerProfileRow>) => {
    if (!walkerProfileId) return
    const { data, error } = await supabase
      .from('walker_profiles')
      .update(patch)
      .eq('id', walkerProfileId)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useCreateWalkerProfile() {
  return useProfileMutation(async (payload: Database['public']['Tables']['walker_profiles']['Insert']) => {
    const { data, error } = await supabase
      .from('walker_profiles')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useStripeConnectOnboard() {
  return useMutation({
    mutationFn: (params: Record<string, unknown> = {}) =>
      apiFetch('stripe-connect-onboard', { method: 'POST', body: JSON.stringify(params) }),
  })
}

export function useStripeConnectCallback() {
  return useMutation({
    mutationFn: () => apiFetch('stripe-connect-callback', { method: 'POST' }),
  })
}

export function useStripeConnectDisconnect() {
  return useMutation({
    mutationFn: (params: Record<string, unknown> = {}) =>
      apiFetch('stripe-connect-disconnect', { method: 'POST', body: JSON.stringify(params) }),
  })
}
