import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { apiFetch } from '@/utils/functions'
import { useRealtimeInvalidate } from './realtime'

type UnreadCountsMap = Record<string, number>

function unreadCountsKey(userId: string | undefined) {
  return ['conversation-unread-counts', userId] as const
}

function useUnreadCountsQuery<TSelected = UnreadCountsMap>(
  userId: string | undefined,
  options: { select?: (map: UnreadCountsMap) => TSelected } = {},
) {
  return useQuery<UnreadCountsMap, Error, TSelected>({
    queryKey: unreadCountsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversation_unread_counts')
      if (error) throw error
      const map: UnreadCountsMap = {}
      for (const row of data || []) map[row.conversation_id] = Number(row.unread_count) || 0
      return map
    },
    select: options.select,
  })
}

export function useTotalUnreadConversations(userId: string | undefined) {
  useRealtimeInvalidate({
    table: 'messages',
    queryKey: unreadCountsKey(userId),
    enabled: !!userId,
  })
  return useUnreadCountsQuery<number>(userId, {
    select: (map) => Object.values(map).reduce((a, b) => a + b, 0),
  })
}

export function useConversationUnreadCount(userId: string | undefined, conversationId: string | undefined) {
  return useUnreadCountsQuery<number>(userId, {
    select: (map) => (conversationId && map ? map[conversationId] || 0 : 0),
  })
}

export function useConversations(userId: string | undefined) {
  const enabled = !!userId
  const queryKey = ['conversations', userId] as const
  useRealtimeInvalidate({ table: 'conversations', queryKey, enabled })
  const convosQuery = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, walker_id, client_id, last_message_at, last_message_preview,
          walker_profiles(business_name, slug),
          users:client_id(name, avatar_url)
        `)
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
  const countsQuery = useUnreadCountsQuery(userId)
  const data = useMemo(() => {
    if (!convosQuery.data) return convosQuery.data as any
    const counts = countsQuery.data || {}
    return convosQuery.data.map((c: any) => ({ ...c, unread_count: counts[c.id] || 0 }))
  }, [convosQuery.data, countsQuery.data])
  return {
    ...convosQuery,
    data,
    isLoading: convosQuery.isLoading || countsQuery.isLoading,
  }
}

export function useConversation(conversationId: string | undefined) {
  const enabled = !!conversationId
  const queryKey = ['conversation', conversationId] as const
  useRealtimeInvalidate({
    table: 'messages',
    filter: enabled ? `conversation_id=eq.${conversationId}` : null,
    queryKey,
    enabled,
  })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const [convoRes, messagesRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, walker_profiles(business_name, slug), users:client_id(name, avatar_url)')
          .eq('id', conversationId!)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId!)
          .order('created_at', { ascending: true }),
      ])
      return { conversation: convoRes.data, messages: messagesRes.data || [] }
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { conversation_id: string; body: string }) =>
      apiFetch('send-chat-message', { method: 'POST', body: JSON.stringify(params) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
    },
  })
}

export function useMarkConversationRead(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!conversationId || !userId) return
      await supabase.from('conversation_reads').upsert({
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      })
    },
    onMutate: (conversationId: string) => {
      queryClient.setQueryData<UnreadCountsMap>(unreadCountsKey(userId), (old) => {
        if (!old) return old
        return { ...old, [conversationId]: 0 }
      })
    },
  })
}

export function useMarkAllConversationsRead(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationIds: string[]) => {
      if (!userId || !conversationIds?.length) return
      const now = new Date().toISOString()
      const rows = conversationIds.map((id) => ({ conversation_id: id, user_id: userId, last_read_at: now }))
      await supabase.from('conversation_reads').upsert(rows)
    },
    onMutate: (conversationIds: string[]) => {
      queryClient.setQueryData<UnreadCountsMap>(unreadCountsKey(userId), (old) => {
        if (!old) return old
        const next = { ...old }
        for (const id of conversationIds) next[id] = 0
        return next
      })
    },
  })
}

export function useEnsureConversation() {
  return useMutation({
    mutationFn: async ({ walkerId, clientId }: { walkerId: string; clientId: string }) => {
      if (!walkerId || !clientId) return null
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('walker_id', walkerId)
        .eq('client_id', clientId)
        .maybeSingle()
      if (existing) return existing.id
      const { data: inserted, error } = await supabase
        .from('conversations')
        .insert({ walker_id: walkerId, client_id: clientId })
        .select('id')
        .single()
      if (!error && inserted) return inserted.id
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('walker_id', walkerId)
        .eq('client_id', clientId)
        .maybeSingle()
      return retry?.id || null
    },
  })
}
