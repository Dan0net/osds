import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'

type AvailabilityRow = { day_of_week: number; start_time: string; end_time: string }

export function useAvailability(walkerProfileId: string | undefined) {
  return useQuery({
    queryKey: ['availability', walkerProfileId] as const,
    enabled: !!walkerProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('walker_id', walkerProfileId!)
      if (error) throw error
      return data || []
    },
  })
}

export function useBlockedDates(walkerProfileId: string | undefined) {
  return useQuery({
    queryKey: ['blocked-dates', walkerProfileId] as const,
    enabled: !!walkerProfileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('walker_id', walkerProfileId!)
        .order('date')
      if (error) throw error
      return data || []
    },
  })
}

function useAvailabilityMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] })
    },
  })
}

export function useReplaceAvailability(walkerProfileId: string | undefined) {
  return useAvailabilityMutation(async (rows: AvailabilityRow[]) => {
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

export function useAddBlockedDate(walkerProfileId: string | undefined) {
  return useAvailabilityMutation(async ({ date, reason }: { date: string; reason?: string }) => {
    if (!walkerProfileId) return
    await supabase.from('blocked_dates').insert({
      walker_id: walkerProfileId, date, reason,
    })
  })
}

export function useRemoveBlockedDate() {
  return useAvailabilityMutation(async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id)
  })
}
