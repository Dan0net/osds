import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { sendChatMessage } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import DetailHeader from '../../components/account/DetailHeader'
import MessageBubble from '../../components/account/MessageBubble'
import MessageComposer from '../../components/account/MessageComposer'

export default function ConversationDetail() {
  const { conversationId } = useParams()
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [paymentMap, setPaymentMap] = useState(() => new Map())
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!user) return
    load()

    function handleIncoming(e) {
      const msg = e.detail
      if (!msg || msg.conversation_id !== conversationId) return
      if (msg.sender_user_id === user.id) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      markRead()
    }
    window.addEventListener('message-received', handleIncoming)
    return () => window.removeEventListener('message-received', handleIncoming)
  }, [user?.id, conversationId])

  async function markRead() {
    await supabase
      .from('conversation_reads')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      })
    window.dispatchEvent(new Event('notifications-read'))
  }

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
    markRead()
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    root.scrollTop = root.scrollHeight
  }, [messages.length, loading])

  // Enrich system-message panels with payment data (price, booking count, source).
  // Status badge is derived from event_type, not fetched, so old messages stay frozen.
  useEffect(() => {
    const ids = new Set()
    for (const m of messages) {
      if (m.kind !== 'system' || !m.link) continue
      const match = m.link.match(/^\/account\/(?:payments|money)\/([^/?#]+)/)
      if (match && !paymentMap.has(match[1])) ids.add(match[1])
    }
    if (ids.size === 0) return
    let cancelled = false
    supabase
      .from('payments')
      .select('id, source, total_cents, platform_fee_cents, refunded_amount_cents, bookings(id, services(name))')
      .in('id', Array.from(ids))
      .then(({ data }) => {
        if (cancelled || !data) return
        setPaymentMap((prev) => {
          const next = new Map(prev)
          for (const p of data) {
            const bookings = p.bookings || []
            next.set(p.id, {
              source: p.source,
              totalCents: p.total_cents,
              platformFeeCents: p.platform_fee_cents || 0,
              refundedAmountCents: p.refunded_amount_cents || 0,
              bookingCount: bookings.length,
              firstServiceName: bookings[0]?.services?.name || null,
            })
          }
          return next
        })
      })
    return () => { cancelled = true }
  }, [messages])

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
    const { data, error } = await sendChatMessage({ conversation_id: conversationId, body })
    if (error || !data) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...m, _failed: true, _pending: false } : m))
      return
    }
    setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data : m))
  }

  // For each payment_id referenced by a system message, find the id of the
  // latest message — older system messages for the same payment are stale.
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
            <p className="text-sm text-gray-400 text-center">Loading…</p>
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
        <MessageComposer onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  )
}
