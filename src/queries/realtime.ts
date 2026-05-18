import { useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { queryClient } from './queryClient'

export function useRealtimeInvalidate({ table, filter, queryKey, enabled = true }) {
  useEffect(() => {
    if (!enabled || !table || !queryKey) return
    const channelName = `${table}:${filter || 'all'}:${Array.isArray(queryKey) ? queryKey.join(':') : queryKey}`
    const options = { event: '*', schema: 'public', table }
    if (filter) options.filter = filter
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', options, () => {
        queryClient.invalidateQueries({ queryKey })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [table, filter, enabled, JSON.stringify(queryKey)])
}
