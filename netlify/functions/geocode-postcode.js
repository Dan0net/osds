import { createClient } from '@supabase/supabase-js'

const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/

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

  const { postcode } = JSON.parse(event.body || '{}')
  const trimmed = (postcode || '').trim().toUpperCase()
  if (!trimmed || !UK_POSTCODE_RE.test(trimmed)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid UK postcode' }) }
  }

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`)
    const json = await res.json()
    if (json.status === 200 && json.result) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { lat: json.result.latitude, lng: json.result.longitude } }),
      }
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { lat: null, lng: null } }),
    }
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Geocoding upstream failed' }) }
  }
}
