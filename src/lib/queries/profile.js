import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { apiFetch } from '../api'

export function useUserProfile(userId) {
  const enabled = !!userId
  return useQuery({
    queryKey: ['user-profile', userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useWalkerProfile(userId) {
  const enabled = !!userId
  return useQuery({
    queryKey: ['walker-profile', userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walker_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function useProfileMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.invalidateQueries({ queryKey: ['walker-profile'] })
    },
  })
}

export function useUpdateUserProfile(userId) {
  return useProfileMutation(async (patch) => {
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

export function useUpdateWalkerProfile(walkerProfileId) {
  return useProfileMutation(async (patch) => {
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
  return useProfileMutation(async (payload) => {
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
    mutationFn: (params = {}) =>
      apiFetch('stripe-connect-onboard', { method: 'POST', body: JSON.stringify(params) }),
  })
}

export function useStripeConnectCallback() {
  return useMutation({
    mutationFn: () => apiFetch('stripe-connect-callback', { method: 'POST' }),
  })
}
