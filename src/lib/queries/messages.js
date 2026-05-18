import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../supabase'
import { apiFetch } from '../api'
import { useRealtimeInvalidate } from './realtime'

function unreadCountsKey(userId) {
  return ['conversation-unread-counts', userId]
}

function useUnreadCountsQuery(userId, options = {}) {
  return useQuery({
    queryKey: unreadCountsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversation_unread_counts')
      if (error) throw error
      const map = {}
      for (const row of data || []) map[row.conversation_id] = Number(row.unread_count) || 0
      return map
    },
    select: options.select,
  })
}

export function useTotalUnreadConversations(userId) {
  // Owns the single realtime subscription for the shared unread-counts cache.
  useRealtimeInvalidate({
    table: 'messages',
    queryKey: unreadCountsKey(userId),
    enabled: !!userId,
  })
  return useUnreadCountsQuery(userId, {
    select: (map) => Object.values(map).reduce((a, b) => a + b, 0),
  })
}

export function useConversations(userId) {
  const enabled = !!userId
  const queryKey = ['conversations', userId]
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
    if (!convosQuery.data) return convosQuery.data
    const counts = countsQuery.data || {}
    return convosQuery.data.map((c) => ({ ...c, unread_count: counts[c.id] || 0 }))
  }, [convosQuery.data, countsQuery.data])
  return {
    ...convosQuery,
    data,
    isLoading: convosQuery.isLoading || countsQuery.isLoading,
  }
}

export function useConversation(conversationId) {
  const enabled = !!conversationId
  const queryKey = ['conversation', conversationId]
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
          .eq('id', conversationId)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])
      return { conversation: convoRes.data, messages: messagesRes.data || [] }
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params) =>
      apiFetch('send-chat-message', { method: 'POST', body: JSON.stringify(params) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
    },
  })
}

export function useMarkConversationRead(userId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId) => {
      if (!conversationId || !userId) return
      await supabase.from('conversation_reads').upsert({
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      })
    },
    onMutate: (conversationId) => {
      queryClient.setQueryData(unreadCountsKey(userId), (old) => {
        if (!old) return old
        return { ...old, [conversationId]: 0 }
      })
    },
  })
}

export function useMarkAllConversationsRead(userId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationIds) => {
      if (!userId || !conversationIds?.length) return
      const now = new Date().toISOString()
      const rows = conversationIds.map((id) => ({ conversation_id: id, user_id: userId, last_read_at: now }))
      await supabase.from('conversation_reads').upsert(rows)
    },
    onMutate: (conversationIds) => {
      queryClient.setQueryData(unreadCountsKey(userId), (old) => {
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
    mutationFn: async ({ walkerId, clientId }) => {
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
      if (!error) return inserted.id
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
