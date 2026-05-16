import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import DetailHeader from '../../components/account/DetailHeader'
import ConversationHeader from '../../components/account/ConversationHeader'
import MessageBubble from '../../components/account/MessageBubble'
import MessageComposer from '../../components/account/MessageComposer'

export default function ConversationDetail() {
  const { conversationId } = useParams()
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!user) return
    load()

    function refresh() { loadMessages() }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [user?.id, conversationId])

  async function load() {
    setLoading(true)
    const [convoRes, messagesRes] = await Promise.all([
      supabase
        .from('conversations')
        .select(`
          id, walker_id, client_id, last_message_at,
          walker_profiles(business_name, slug),
          users:client_id(id, name, avatar_url)
        `)
        .eq('id', conversationId)
        .maybeSingle(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ])
    setConversation(convoRes.data)
    setMessages(messagesRes.data || [])
    setLoading(false)

    // Mark conversation as read
    await supabase
      .from('conversation_reads')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      })
    window.dispatchEvent(new Event('notifications-read'))
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    await supabase
      .from('conversation_reads')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      })
    window.dispatchEvent(new Event('notifications-read'))
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    root.scrollTop = root.scrollHeight
  }, [messages.length, loading])

  async function sendMessage(body) {
    const optimistic = {
      id: `tmp-${Date.now()}`,
      conversation_id: conversationId,
      sender_user_id: user.id,
      kind: 'chat',
      body,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_user_id: user.id, kind: 'chat', body })
      .select('*')
      .single()
    if (error) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...m, _failed: true, _pending: false } : m))
      return
    }
    setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data : m))
  }

  const counterpartyName = isWalker
    ? (conversation?.users?.name || 'Customer')
    : (conversation?.walker_profiles?.business_name || 'Walker')
  const counterpartyAvatar = isWalker ? conversation?.users?.avatar_url : null
  const counterpartyTo = isWalker && conversation?.users?.id
    ? `/account/customers/${conversation.users.id}`
    : (!isWalker && conversation?.walker_profiles?.slug
      ? `https://${conversation.walker_profiles.slug}.onestopdog.shop`
      : null)
  const counterpartyTarget = !isWalker ? '_blank' : undefined

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom))] lg:h-[calc(100vh-3rem)]">
      <DetailHeader
        backHref="/account/messages"
        backLabel="Messages"
        title={counterpartyName}
      />

      <ConversationHeader
        name={counterpartyName}
        avatarUrl={counterpartyAvatar}
        to={counterpartyTo}
        target={counterpartyTarget}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400 text-center">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center">No messages yet. Say hi.</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isSelf={m.sender_user_id === user.id} />
          ))
        )}
      </div>

      <div className="-mx-4 lg:-mx-0 lg:mt-2">
        <MessageComposer onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  )
}
