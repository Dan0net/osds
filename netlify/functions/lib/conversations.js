// Find or create the single conversation between a walker_profile and a client user.
// Admin (service role) client only — bypasses RLS for system writes.

export async function getOrCreateConversation(adminSupabase, walkerId, clientId) {
  const { data: existing } = await adminSupabase
    .from('conversations')
    .select('id')
    .eq('walker_id', walkerId)
    .eq('client_id', clientId)
    .maybeSingle()
  if (existing) return existing.id

  const { data: inserted, error } = await adminSupabase
    .from('conversations')
    .insert({ walker_id: walkerId, client_id: clientId })
    .select('id')
    .single()
  if (error) {
    // Lost a race — fetch again
    const { data: retry } = await adminSupabase
      .from('conversations')
      .select('id')
      .eq('walker_id', walkerId)
      .eq('client_id', clientId)
      .maybeSingle()
    return retry?.id || null
  }
  return inserted.id
}
