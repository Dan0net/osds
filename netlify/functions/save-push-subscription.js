import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
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

  const body = JSON.parse(event.body || '{}')

  if (event.httpMethod === 'DELETE') {
    const { endpoint } = body
    if (!endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'endpoint is required' }) }
    }

    await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { removed: true } }),
    }
  }

  // POST — save subscription
  const { endpoint, keys, device_type } = body
  if (!endpoint || !keys) {
    return { statusCode: 400, body: JSON.stringify({ error: 'endpoint and keys are required' }) }
  }

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Upsert on endpoint conflict
  const { data, error } = await adminSupabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, keys, device_type: device_type || '' },
      { onConflict: 'endpoint' },
    )
    .select('id')
    .single()

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save subscription' }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: data.id } }),
  }
}
