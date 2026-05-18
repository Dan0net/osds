import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import type { Database } from '@/types/database'

type ServiceInsert = Database['public']['Tables']['services']['Insert']
type ServiceUpdate = Database['public']['Tables']['services']['Update']

export function useServices(walkerProfileId: string | undefined, { activeOnly = false }: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ['services', walkerProfileId, { activeOnly }] as const,
    enabled: !!walkerProfileId,
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('walker_id', walkerProfileId!)
        .order('created_at')
      if (activeOnly) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useServicesCount(walkerProfileId: string | undefined) {
  return useQuery({
    queryKey: ['services-count', walkerProfileId] as const,
    enabled: !!walkerProfileId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('walker_id', walkerProfileId!)
      if (error) throw error
      return count || 0
    },
  })
}

export function useService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service', serviceId] as const,
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId!)
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

export function useCreateService(walkerProfileId: string | undefined) {
  return useServiceMutation(async (data: Omit<ServiceInsert, 'walker_id'>) => {
    if (!walkerProfileId) return
    const { data: inserted, error } = await supabase
      .from('services')
      .insert({ ...data, walker_id: walkerProfileId })
      .select()
      .single()
    if (error) throw error
    return inserted
  })
}

export function useUpdateService(serviceId: string | undefined) {
  return useServiceMutation(async (patch: ServiceUpdate) => {
    if (!serviceId) return
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
  return useServiceMutation(async (serviceId: string) => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) throw error
  })
}
