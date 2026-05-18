import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import type { Database } from '@/types/database'

type PetInsert = Database['public']['Tables']['pets']['Insert']
type PetUpdate = Database['public']['Tables']['pets']['Update']

export function usePets(userId: string | undefined) {
  return useQuery({
    queryKey: ['pets', userId] as const,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at')
      if (error) throw error
      return data || []
    },
  })
}

function usePetMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export function useCreatePet() {
  return usePetMutation(async ({ userId, pet }: { userId: string; pet: Omit<PetInsert, 'user_id'> }) => {
    const { data, error } = await supabase
      .from('pets')
      .insert({ user_id: userId, ...pet })
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useUpdatePet() {
  return usePetMutation(async ({ petId, patch }: { petId: string; patch: PetUpdate }) => {
    const { data, error } = await supabase
      .from('pets')
      .update(patch)
      .eq('id', petId)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useDeletePet() {
  return usePetMutation(async (petId: string) => {
    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (error) throw error
  })
}
