import { supabase } from './supabase'

export async function getUnreadCounts(userId) {
  if (!userId) return new Map()
  const { data: convos } = await supabase
    .from('conversations')
    .select('id, last_message_at')
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

export async function markAllConversationsRead(userId, conversationIds) {
  if (!userId || !conversationIds?.length) return
  const now = new Date().toISOString()
  const rows = conversationIds.map((id) => ({ conversation_id: id, user_id: userId, last_read_at: now }))
  await supabase.from('conversation_reads').upsert(rows)
  window.dispatchEvent(new Event('notifications-read'))
}

// Return the existing conversation id for this walker↔client pair, or create one.
// RLS allows either party to insert.
export async function ensureConversation(walkerId, clientId) {
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

  // Race with another inserter — the UNIQUE constraint kicked in. Re-fetch.
  const { data: retry } = await supabase
    .from('conversations')
    .select('id')
    .eq('walker_id', walkerId)
    .eq('client_id', clientId)
    .maybeSingle()
  return retry?.id || null
}
