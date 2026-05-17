import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCounts } from '../../lib/messaging'
import ConversationRow from '../../components/account/ConversationRow'

export default function AccountMessages() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()

    window.addEventListener('message-received', load)
    return () => window.removeEventListener('message-received', load)
  }, [user?.id, walkerProfile?.id])

  async function load() {
    setLoading(true)
    const [convosRes, counts] = await Promise.all([
      supabase
        .from('conversations')
        .select(`
          id, walker_id, client_id, last_message_at, last_message_preview,
          walker_profiles(business_name, slug),
          users:client_id(name, avatar_url)
        `)
        .order('last_message_at', { ascending: false }),
      getUnreadCounts(user.id),
    ])
    const withUnread = (convosRes.data || []).map((c) => ({ ...c, unread_count: counts.get(c.id) || 0 }))
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
