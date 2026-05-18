import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../supabase'
import { apiFetch } from '../api'
import { useRealtimeInvalidate } from './realtime'

async function fetchUnreadCounts(userId) {
  const { data: convos } = await supabase.from('conversations').select('id, last_message_at')
  if (!convos || convos.length === 0) return new Map()
  const { data: reads } = await supabase
    .from('conversation_reads')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
  const readMap = new Map((reads || []).map((r) => [r.conversation_id, r.last_read_at]))
  const entries = await Promise.all(convos.map(async (c) => {
    const lastRead = readMap.get(c.id) || '1970-01-01T00:00:00Z'
    if (c.last_message_at <= lastRead) return [c.id, 0]
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', c.id)
      .gt('created_at', lastRead)
      .or(`sender_user_id.is.null,sender_user_id.neq.${userId}`)
    return [c.id, count || 0]
  }))
  return new Map(entries)
}

// Subscribe to INSERTed messages for this user across all conversations,
// fanning out `message-received` window events and invalidating the unread
// counts cache when the sender isn't the current user.
export function useInboundMessagesChannel(userId) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`messages-for-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          window.dispatchEvent(new CustomEvent('message-received', { detail: msg }))
          if (msg.sender_user_id !== userId) {
            queryClient.invalidateQueries({ queryKey: ['total-unread-conversations'] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, queryClient])
}

export function useTotalUnreadConversations(userId) {
  const enabled = !!userId
  return useQuery({
    queryKey: ['total-unread-conversations', userId],
    enabled,
    queryFn: async () => {
      const counts = await fetchUnreadCounts(userId)
      let total = 0
      for (const n of counts.values()) total += n
      return total
    },
  })
}

export function useConversations(userId) {
  const enabled = !!userId
  const queryKey = ['conversations', userId]
  useRealtimeInvalidate({ table: 'conversations', queryKey, enabled })
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const [convosRes, counts] = await Promise.all([
        supabase
          .from('conversations')
          .select(`
            id, walker_id, client_id, last_message_at, last_message_preview,
            walker_profiles(business_name, slug),
            users:client_id(name, avatar_url)
          `)
          .order('last_message_at', { ascending: false }),
        fetchUnreadCounts(userId),
      ])
      return (convosRes.data || []).map((c) => ({ ...c, unread_count: counts.get(c.id) || 0 }))
    },
  })
}

export function useConversation(conversationId) {
  const enabled = !!conversationId
  const queryKey = ['conversation', conversationId]
  useRealtimeInvalidate({
    table: 'messages', filter: enabled ? `conversation_id=eq.${conversationId}` : null, queryKey, enabled,
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

function useMessagesMutation(fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
    },
  })
}

export function useSendMessage() {
  return useMessagesMutation((params) =>
    apiFetch('send-chat-message', { method: 'POST', body: JSON.stringify(params) }),
  )
}

export function useMarkConversationRead(userId) {
  return useMessagesMutation(async (conversationId) => {
    if (!conversationId || !userId) return
    await supabase.from('conversation_reads').upsert({
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    })
    window.dispatchEvent(new Event('notifications-read'))
  })
}

export function useMarkAllConversationsRead(userId) {
  return useMessagesMutation(async (conversationIds) => {
    if (!userId || !conversationIds?.length) return
    const now = new Date().toISOString()
    const rows = conversationIds.map((id) => ({ conversation_id: id, user_id: userId, last_read_at: now }))
    await supabase.from('conversation_reads').upsert(rows)
    window.dispatchEvent(new Event('notifications-read'))
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
