import { createClient } from '@supabase/supabase-js'
import { fetchExternalEvents } from './lib/ical-import.js'

function createAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  // Look up walker profile for this user
  const adminClient = createAdminClient()
  const { data: walkerProfile } = await adminClient
    .from('walker_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!walkerProfile) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { events: [] } }),
    }
  }

  // Clear cache if refresh requested
  const refresh = event.queryStringParameters?.refresh === 'true'
  if (refresh) {
    const { data: imports } = await adminClient
      .from('ical_imports')
      .select('id')
      .eq('walker_id', walkerProfile.id)
    if (imports?.length) {
      await adminClient.from('ical_cache').delete().in('import_id', imports.map((i) => i.id))
    }
  }

  const { events, errors } = await fetchExternalEvents(adminClient, walkerProfile.id)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { events, errors } }),
  }
}
