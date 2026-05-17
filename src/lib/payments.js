import { supabase } from './supabase'

/** Set of payment ids the user has not yet seen the latest state of. */
export async function getUnreadPaymentIds(userId) {
  if (!userId) return new Set()
  const { data: payments } = await supabase
    .from('payments')
    .select('id, updated_at')
  if (!payments || payments.length === 0) return new Set()

  const { data: reads } = await supabase
    .from('payment_reads')
    .select('payment_id, last_seen_at')
    .eq('user_id', userId)
  const readMap = new Map((reads || []).map((r) => [r.payment_id, r.last_seen_at]))

  const unread = new Set()
  for (const p of payments) {
    const lastSeen = readMap.get(p.id)
    if (!lastSeen || lastSeen < p.updated_at) unread.add(p.id)
  }
  return unread
}

/** Mark a single payment as seen by the user. */
export async function markPaymentRead(paymentId, userId) {
  if (!paymentId || !userId) return
  await supabase
    .from('payment_reads')
    .upsert({ payment_id: paymentId, user_id: userId, last_seen_at: new Date().toISOString() })
  window.dispatchEvent(new Event('payments-read'))
}

export async function markAllPaymentsRead(userId, paymentIds) {
  if (!userId || !paymentIds?.length) return
  const now = new Date().toISOString()
  const rows = paymentIds.map((id) => ({ payment_id: id, user_id: userId, last_seen_at: now }))
  await supabase.from('payment_reads').upsert(rows)
  window.dispatchEvent(new Event('payments-read'))
}
