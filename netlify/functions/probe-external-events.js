import { createClient } from '@supabase/supabase-js'
import { probeWalkerCalendars } from './lib/ical-import.js'

function createAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
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

  const { walker_id } = JSON.parse(event.body || '{}')
  if (!walker_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'walker_id is required' }) }
  }

  const adminClient = createAdminClient()
  const result = await probeWalkerCalendars(adminClient, walker_id)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: result }),
  }
}
