import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export function usePets(userId) {
  const enabled = !!userId
  return useQuery({
    queryKey: ['pets', userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at')
      if (error) throw error
      return data || []
    },
  })
}

function usePetMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export function useCreatePet() {
  return usePetMutation(async ({ userId, pet }) => {
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
  return usePetMutation(async ({ petId, patch }) => {
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
  return usePetMutation(async (petId) => {
    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (error) throw error
  })
}
