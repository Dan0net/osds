import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
  }

  const { data: wp } = await supabase
    .from('walker_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!wp) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not a walker' }) }
  }

  const { name, email, phone, notes } = JSON.parse(event.body || '{}')
  const trimmedName = (name || '').trim()
  const trimmedEmail = (email || '').trim().toLowerCase()

  if (!trimmedName || trimmedName.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name is required' }) }
  }
  if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email is required' }) }
  }

  // Reuse existing user if email already exists
  const { data: existingProfile } = await admin
    .from('users')
    .select('id, name, email, phone, avatar_url')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (existingProfile) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { user: existingProfile, invited: false } }),
    }
  }

  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: { name: trimmedName, phone: phone?.trim() || null },
    redirectTo: `${siteUrl}/reset-password`,
  })

  if (inviteErr) {
    return { statusCode: 500, body: JSON.stringify({ error: inviteErr.message }) }
  }

  // Backfill profile fields the trigger may not have set
  const newUserId = invited?.user?.id
  if (newUserId) {
    await admin
      .from('users')
      .update({ name: trimmedName, phone: phone?.trim() || null })
      .eq('id', newUserId)
  }

  const { data: profile } = await admin
    .from('users')
    .select('id, name, email, phone, avatar_url')
    .eq('id', newUserId)
    .maybeSingle()

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { user: profile, invited: true } }),
  }
}
