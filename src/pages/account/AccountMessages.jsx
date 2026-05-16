import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import ConversationRow from '../../components/account/ConversationRow'

export default function AccountMessages() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()

    function refresh() { load() }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [user?.id, walkerProfile?.id])

  async function load() {
    setLoading(true)

    const { data: convos } = await supabase
      .from('conversations')
      .select(`
        id, walker_id, client_id, last_message_at, last_message_preview,
        walker_profiles(business_name, slug),
        users:client_id(name, avatar_url)
      `)
      .order('last_message_at', { ascending: false })

    const list = convos || []

    // Per-user last_read_at
    const { data: reads } = await supabase
      .from('conversation_reads')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
    const readMap = new Map((reads || []).map((r) => [r.conversation_id, r.last_read_at]))

    // Compute unread counts (single round-trip via per-conversation counts)
    const withUnread = await Promise.all(list.map(async (c) => {
      const lastRead = readMap.get(c.id) || '1970-01-01T00:00:00Z'
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .gt('created_at', lastRead)
        .neq('sender_user_id', user.id)
      return { ...c, unread_count: count || 0 }
    }))

    setConversations(withUnread)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl mb-4">Messages</h1>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-gray-400">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const counterpartyName = isWalker
              ? (c.users?.name || 'Customer')
              : (c.walker_profiles?.business_name || 'Walker')
            const avatarUrl = isWalker ? c.users?.avatar_url : null
            return (
              <ConversationRow
                key={c.id}
                conversation={c}
                counterpartyName={counterpartyName}
                avatarUrl={avatarUrl}
                preview={c.last_message_preview}
                unreadCount={c.unread_count}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
