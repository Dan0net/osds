import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { apiFetch } from '../api'

export function useIcalImports(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['ical-imports', walkerProfileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ical_imports')
        .select('*')
        .eq('walker_id', walkerProfileId)
        .order('created_at')
      if (error) throw error
      return data || []
    },
  })
}

// External events: gated to avoid the slow Netlify hop when no calendars are connected.
export function useExternalEvents(walkerProfileId) {
  const enabled = !!walkerProfileId
  return useQuery({
    queryKey: ['external-events', walkerProfileId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('ical_imports')
        .select('id', { count: 'exact', head: true })
        .eq('walker_id', walkerProfileId)
      if (!count) return []
      const res = await apiFetch('get-external-events')
      return res?.data?.events || []
    },
  })
}

function useIcalMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-imports'] })
      queryClient.invalidateQueries({ queryKey: ['external-events'] })
    },
  })
}

export function useValidateIcalUrl() {
  return useMutation({
    mutationFn: (url) => apiFetch('validate-ical-url', { method: 'POST', body: JSON.stringify({ url }) }),
  })
}

export function useAddIcalImport(walkerProfileId) {
  return useIcalMutation(async ({ label, url }) => {
    const { error } = await supabase.from('ical_imports').insert({
      walker_id: walkerProfileId, label, url,
    })
    if (error) throw error
  })
}

export function useRemoveIcalImport() {
  return useIcalMutation(async (id) => {
    const { error } = await supabase.from('ical_imports').delete().eq('id', id)
    if (error) throw error
  })
}
