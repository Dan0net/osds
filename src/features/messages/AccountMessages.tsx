import { useState, useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useConversations, useMarkAllConversationsRead } from '@/queries/messages'
import { useAutoSelectFirst } from '@/shared/useAutoSelectFirst'
import ConversationRow from '@/features/messages/ConversationRow'
import ListDetailLayout from '@/shared/layout/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '@/shared/list/ListPaneHeader'
import FilterPills from '@/shared/form/FilterPills'
import { Spinner } from '@/shared/Spinner'

export default function AccountMessages() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile
  const [unreadOnly, setUnreadOnly] = useState(false)

  const conversationsQuery = useConversations(user?.id)
  const markAllRead = useMarkAllConversationsRead(user?.id)
  const conversations = conversationsQuery.data || []
  const loading = conversationsQuery.isLoading

  useAutoSelectFirst({ items: conversations, getHref: (c) => `/account/messages/${c.id}` })

  const filtered = useMemo(
    () => unreadOnly ? conversations.filter((c) => c.unread_count > 0) : conversations,
    [conversations, unreadOnly],
  )
  const unreadTotal = useMemo(() => conversations.filter((c) => c.unread_count > 0).length, [conversations])

  function handleMarkAllRead() {
    const ids = conversations.filter((c) => c.unread_count > 0).map((c) => c.id)
    if (!ids.length) return
    markAllRead.mutate(ids)
  }

  const listHeader = (
    <>
      <ListPaneHeader title="Messages" />
      <ListPaneSubrow>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPills
            value={unreadOnly}
            onChange={setUnreadOnly}
            options={[
              { value: false, label: 'All', count: conversations.length },
              { value: true, label: 'Unread', count: unreadTotal },
            ]}
          />
          {unreadTotal > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="cursor-pointer ml-auto h-10 lg:h-8 px-4 lg:px-3 inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm lg:text-xs font-medium rounded-full"
            >
              Mark all read
            </button>
          )}
        </div>
      </ListPaneSubrow>
    </>
  )

  const list = loading ? (
    <div className="flex justify-center py-8"><Spinner /></div>
  ) : filtered.length === 0 ? (
    <p className="text-sm text-gray-400 px-3 py-3">{unreadOnly ? 'No unread conversations.' : 'No conversations yet.'}</p>
  ) : (
    filtered.map((c) => {
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
    })
  )

  return (
    <ListDetailLayout
      list={list}
      listHeader={listHeader}
      emptyDetail={<p className="text-sm text-gray-400">Select a conversation.</p>}
    />
  )
}
