import { supabase } from './supabase'

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
