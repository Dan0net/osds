import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useConversation, useSendMessage, useMarkConversationRead, useConversationUnreadCount } from '@/queries/messages'
import { usePaymentsByIds } from '@/queries/payments'
import DetailHeader from '@/shared/DetailHeader'
import MessageBubble from '@/features/messages/MessageBubble'
import MessageComposer from '@/features/messages/MessageComposer'
import { Spinner } from '@/shared/Spinner'

function extractPaymentIds(messages) {
  const ids = new Set()
  for (const m of messages) {
    if (m.kind !== 'system' || !m.link) continue
    const match = m.link.match(/^\/account\/(?:payments|money)\/([^/?#]+)/)
    if (match) ids.add(match[1])
  }
  return [...ids]
}

export default function ConversationDetail() {
  const { conversationId } = useParams()
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const conversationQuery = useConversation(conversationId)
  const sendMessage = useSendMessage()
  const markRead = useMarkConversationRead(user?.id)
  const unreadCount = useConversationUnreadCount(user?.id, conversationId).data || 0

  const conversation = conversationQuery.data?.conversation
  const serverMessages = conversationQuery.data?.messages || []
  const loading = conversationQuery.isLoading

  const [pendingMessages, setPendingMessages] = useState([])
  const messages = useMemo(() => {
    if (!pendingMessages.length) return serverMessages
    const seen = new Set(serverMessages.map((m) => m.id))
    return [...serverMessages, ...pendingMessages.filter((m) => !seen.has(m.id))]
  }, [serverMessages, pendingMessages])

  const paymentIds = useMemo(() => extractPaymentIds(messages), [messages])
  const paymentsQuery = usePaymentsByIds(paymentIds)
  const paymentMap = useMemo(() => {
    const map = new Map()
    for (const p of paymentsQuery.data || []) {
      const bookings = p.bookings || []
      map.set(p.id, {
        source: p.source,
        totalCents: p.total_cents,
        platformFeeCents: p.platform_fee_cents || 0,
        refundedAmountCents: p.refunded_amount_cents || 0,
        bookingCount: bookings.length,
        firstServiceName: bookings[0]?.services?.name || null,
      })
    }
    return map
  }, [paymentsQuery.data])

  const scrollRef = useRef(null)

  useEffect(() => {
    if (!user?.id || !conversationId || unreadCount === 0) return
    markRead.mutate(conversationId)
  }, [user?.id, conversationId, unreadCount])

  // Reconcile pending messages once they arrive from the server.
  useEffect(() => {
    if (!pendingMessages.length) return
    const serverIds = new Set(serverMessages.map((m) => m.id))
    setPendingMessages((prev) => prev.filter((m) => !serverIds.has(m.id)))
  }, [serverMessages])

  // Auto-scroll to bottom on message change.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    root.scrollTop = root.scrollHeight
  }, [messages.length, loading])

  async function handleSend(body) {
    const tempId = `tmp-${Date.now()}`
    const optimistic = {
      id: tempId,
      conversation_id: conversationId,
      sender_user_id: user.id,
      kind: 'chat',
      body,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setPendingMessages((prev) => [...prev, optimistic])
    try {
      const { data, error } = await sendMessage.mutateAsync({ conversation_id: conversationId, body })
      if (error || !data) {
        setPendingMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, _failed: true, _pending: false } : m))
        return
      }
      setPendingMessages((prev) => prev.map((m) => m.id === tempId ? data : m))
    } catch {
      setPendingMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, _failed: true, _pending: false } : m))
    }
  }

  const latestMessageIdByPayment = useMemo(() => {
    const map = new Map()
    for (const m of messages) {
      if (m.kind !== 'system') continue
      const paymentId = m.link?.match(/^\/account\/(?:payments|money)\/([^/?#]+)/)?.[1]
      if (paymentId) map.set(paymentId, m.id)
    }
    return map
  }, [messages])

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
    <div className="flex flex-col h-full pt-3 lg:pt-0">
      <DetailHeader
        backHref="/account/messages"
        backLabel="Messages"
        title={counterpartyName}
        avatarUrl={counterpartyAvatar}
        titleHref={counterpartyTo}
        titleTarget={counterpartyTarget}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center"><Spinner /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">No messages yet. Say hi.</p>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isSelf={m.sender_user_id === user.id}
                paymentMap={paymentMap}
                latestMessageIdByPayment={latestMessageIdByPayment}
                isOwner={!isWalker}
              />
            ))
          )}
        </div>
      </div>

      <div className="-mx-4">
        <MessageComposer onSend={handleSend} disabled={loading} />
      </div>
    </div>
  )
}
