import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCounts } from '../../lib/messaging'
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst'
import ConversationRow from '../../components/account/ConversationRow'
import ListDetailLayout from '../../components/account/ListDetailLayout'
import FilterPills from '../../components/account/FilterPills'

export default function AccountMessages() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)

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

  useAutoSelectFirst({ items: conversations, getHref: (c) => `/account/messages/${c.id}` })

  const filtered = useMemo(
    () => unreadOnly ? conversations.filter((c) => c.unread_count > 0) : conversations,
    [conversations, unreadOnly],
  )
  const unreadTotal = useMemo(() => conversations.filter((c) => c.unread_count > 0).length, [conversations])

  const listHeader = (
    <FilterPills
      value={unreadOnly}
      onChange={setUnreadOnly}
      options={[
        { value: false, label: 'All', count: conversations.length },
        { value: true, label: 'Unread', count: unreadTotal },
      ]}
    />
  )

  const list = loading ? (
    <p className="text-sm text-gray-400">Loading…</p>
  ) : filtered.length === 0 ? (
    <p className="text-sm text-gray-400">{unreadOnly ? 'No unread conversations.' : 'No conversations yet.'}</p>
  ) : (
    <div className="space-y-2">
      {filtered.map((c) => {
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
  )

  return (
    <ListDetailLayout
      list={list}
      listHeader={listHeader}
      emptyDetail={<p className="text-sm text-gray-400">Select a conversation.</p>}
    />
  )
}
