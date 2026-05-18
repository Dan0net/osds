import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'

export function useServices(walkerProfileId, { activeOnly = false } = {}) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['services', walkerProfileId, { activeOnly }],
    enabled,
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('walker_id', walkerProfileId)
        .order('created_at')
      if (activeOnly) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useServicesCount(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['services-count', walkerProfileId],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('walker_id', walkerProfileId)
      if (error) throw error
      return count || 0
    },
  })
}

export function useService(serviceId) {
  const enabled = !!serviceId
  return useQuery({
    queryKey: ['service', serviceId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()
      if (error) throw error
      return data
    },
  })
}

function useServiceMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service'] })
      queryClient.invalidateQueries({ queryKey: ['services-count'] })
    },
  })
}

export function useCreateService(walkerProfileId) {
  return useServiceMutation(async (data) => {
    const { data: inserted, error } = await supabase
      .from('services')
      .insert({ ...data, walker_id: walkerProfileId })
      .select()
      .single()
    if (error) throw error
    return inserted
  })
}

export function useUpdateService(serviceId) {
  return useServiceMutation(async (patch) => {
    const { data, error } = await supabase
      .from('services')
      .update(patch)
      .eq('id', serviceId)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useDeleteService() {
  return useServiceMutation(async (serviceId) => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) throw error
  })
}
