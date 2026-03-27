import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@onestopdog.shop',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Admin-only: requires service role key in Authorization header
  const authHeader = event.headers.authorization?.replace('Bearer ', '')
  if (authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { user_id, title, body: pushBody, url } = JSON.parse(event.body || '{}')
  if (!user_id || !title) {
    return { statusCode: 400, body: JSON.stringify({ error: 'user_id and title are required' }) }
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', user_id)

  let sent = 0
  for (const sub of (subs || [])) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body: pushBody || '', url: url || '/account/inbox' }),
      )
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { sent } }),
  }
}
