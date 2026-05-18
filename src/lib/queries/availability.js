import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export function useAvailability(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['availability', walkerProfileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('walker_id', walkerProfileId)
      if (error) throw error
      return data || []
    },
  })
}

export function useBlockedDates(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['blocked-dates', walkerProfileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('walker_id', walkerProfileId)
        .order('date')
      if (error) throw error
      return data || []
    },
  })
}

function useAvailabilityMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] })
    },
  })
}

// Replace the walker's entire weekly schedule with the given enabled rows.
export function useReplaceAvailability(walkerProfileId) {
  return useAvailabilityMutation(async (rows) => {
    if (!walkerProfileId) return
    await supabase.from('availability').delete().eq('walker_id', walkerProfileId)
    if (rows.length > 0) {
      await supabase.from('availability').insert(
        rows.map((r) => ({
          walker_id: walkerProfileId,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
        })),
      )
    }
  })
}

export function useAddBlockedDate(walkerProfileId) {
  return useAvailabilityMutation(async ({ date, reason }) => {
    if (!walkerProfileId) return
    await supabase.from('blocked_dates').insert({
      walker_id: walkerProfileId, date, reason,
    })
  })
}

export function useRemoveBlockedDate() {
  return useAvailabilityMutation(async (id) => {
    await supabase.from('blocked_dates').delete().eq('id', id)
  })
}
