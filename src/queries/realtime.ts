import { useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { queryClient } from './queryClient'
import type { QueryKey } from '@tanstack/react-query'

interface RealtimeArgs {
  table: string
  filter?: string | null
  queryKey: QueryKey
  enabled?: boolean
}

export function useRealtimeInvalidate({ table, filter, queryKey, enabled = true }: RealtimeArgs) {
  useEffect(() => {
    if (!enabled || !table || !queryKey) return
    const channelName = `${table}:${filter || 'all'}:${Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)}`
    const options: { event: string; schema: string; table: string; filter?: string } = {
      event: '*',
      schema: 'public',
      table,
    }
    if (filter) options.filter = filter
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes' as any, options, () => {
        queryClient.invalidateQueries({ queryKey })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [table, filter, enabled, JSON.stringify(queryKey)])
}
