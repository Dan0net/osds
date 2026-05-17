import { createClient } from '@supabase/supabase-js'
import { notifyChatMessage } from './lib/notify.js'

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

  const { conversation_id, body } = JSON.parse(event.body || '{}')
  if (!conversation_id || !body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'conversation_id and body required' }) }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({ conversation_id, sender_user_id: user.id, kind: 'chat', body })
    .select('*')
    .single()
  if (insertError) {
    return { statusCode: 400, body: JSON.stringify({ error: insertError.message }) }
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: convo } = await admin
    .from('conversations')
    .select('client_id, walker_profiles(user_id, business_name), users:client_id(name)')
    .eq('id', conversation_id)
    .single()

  if (convo) {
    const walkerUserId = convo.walker_profiles?.user_id
    const senderIsWalker = walkerUserId === user.id
    const recipientUserId = senderIsWalker ? convo.client_id : walkerUserId
    const senderName = senderIsWalker
      ? (convo.walker_profiles?.business_name || 'Your walker')
      : (convo.users?.name || 'Your customer')
    notifyChatMessage(admin, {
      recipientUserId,
      senderName,
      preview: body,
      conversationId: conversation_id,
    }).catch((err) => console.error('notifyChatMessage failed:', err.message))
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: inserted }),
  }
}
