import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import { apiFetch } from '@/utils/functions'
import { queryClient } from './queryClient'
import { useRealtimeInvalidate } from './realtime'

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
// Refresh signal comes from walker_profiles.external_events_updated_at via realtime.
export function useExternalEvents(walkerProfileId: string | undefined) {
  const enabled = !!walkerProfileId
  useRealtimeInvalidate({
    table: 'walker_profiles',
    filter: walkerProfileId ? `id=eq.${walkerProfileId}` : null,
    queryKey: ['external-events', walkerProfileId],
    enabled,
  })
  return useQuery({
    queryKey: ['external-events', walkerProfileId],
    enabled,
    staleTime: Infinity,
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

function useIcalMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ical-imports'] })
      queryClient.invalidateQueries({ queryKey: ['external-events'] })
    },
  })
}

export function useProbeExternalEvents(walkerId: string | undefined) {
  return useMutation({
    mutationKey: ['probe-external', walkerId],
    mutationFn: async () => {
      if (!walkerId) return null
      return apiFetch('probe-external-events', {
        method: 'POST',
        body: JSON.stringify({ walker_id: walkerId }),
      })
    },
    onSuccess: () => {
      if (walkerId) queryClient.invalidateQueries({ queryKey: ['external-events', walkerId] })
    },
  })
}

export function useIsProbingExternal(walkerId: string | undefined) {
  const count = useIsMutating({ mutationKey: ['probe-external', walkerId] })
  return count > 0
}

export function useProbeOnMount(walkerId: string | undefined, enabled = true) {
  const probe = useProbeExternalEvents(walkerId)
  useEffect(() => {
    if (!enabled || !walkerId) return
    probe.mutate()
  }, [enabled, walkerId])
}

export function useValidateIcalUrl() {
  return useMutation({
    mutationFn: (url: string) => apiFetch('validate-ical-url', { method: 'POST', body: JSON.stringify({ url }) }),
  })
}

export function useAddIcalImport(walkerProfileId: string | undefined) {
  return useIcalMutation(async ({ label, url }: { label: string; url: string }) => {
    if (!walkerProfileId) return
    const { error } = await supabase.from('ical_imports').insert({
      walker_id: walkerProfileId, label, url,
    })
    if (error) throw error
  })
}

export function useRemoveIcalImport() {
  return useIcalMutation(async (id: string) => {
    const { error } = await supabase.from('ical_imports').delete().eq('id', id)
    if (error) throw error
  })
}
