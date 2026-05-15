import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_PER_HOUR = 20
const RATE_LIMIT_PER_DAY = 100

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
    .select('id, business_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!wp) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not a walker' }) }
  }

  const { name, email, phone, postcode } = JSON.parse(event.body || '{}')
  const trimmedName = (name || '').trim()
  const trimmedEmail = (email || '').trim().toLowerCase()
  const trimmedPostcode = (postcode || '').trim().toUpperCase() || null

  if (!trimmedName || trimmedName.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name is required' }) }
  }
  if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email is required' }) }
  }

  // Per-walker rate limit. Counts only successful invites (not rate_limited rows).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: hourCount } = await admin
    .from('customer_invites')
    .select('id', { count: 'exact', head: true })
    .eq('walker_id', wp.id)
    .in('result', ['invited', 'already_exists'])
    .gte('created_at', oneHourAgo)
  const { count: dayCount } = await admin
    .from('customer_invites')
    .select('id', { count: 'exact', head: true })
    .eq('walker_id', wp.id)
    .in('result', ['invited', 'already_exists'])
    .gte('created_at', oneDayAgo)

  if ((hourCount || 0) >= RATE_LIMIT_PER_HOUR || (dayCount || 0) >= RATE_LIMIT_PER_DAY) {
    await admin.from('customer_invites').insert({
      walker_id: wp.id,
      email: trimmedEmail,
      name: trimmedName,
      result: 'rate_limited',
    })
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invite limit reached. Try again later.' }),
    }
  }

  // Reuse existing user if email already exists
  const { data: existingProfile } = await admin
    .from('users')
    .select('id, name, email, phone, avatar_url')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (existingProfile) {
    await admin.from('customer_invites').insert({
      walker_id: wp.id,
      invited_user_id: existingProfile.id,
      email: trimmedEmail,
      name: trimmedName,
      result: 'already_exists',
    })
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          user: existingProfile,
          status: 'already_exists',
        },
      }),
    }
  }

  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: {
      name: trimmedName,
      phone: phone?.trim() || null,
      postcode: trimmedPostcode,
      invited_by_walker_name: wp.business_name || '',
    },
    redirectTo: `${siteUrl}/reset-password`,
  })

  if (inviteErr) {
    await admin.from('customer_invites').insert({
      walker_id: wp.id,
      email: trimmedEmail,
      name: trimmedName,
      result: 'failed',
    })
    return { statusCode: 500, body: JSON.stringify({ error: inviteErr.message }) }
  }

  const newUserId = invited?.user?.id
  if (newUserId) {
    await admin
      .from('users')
      .update({
        name: trimmedName,
        phone: phone?.trim() || null,
        postcode: trimmedPostcode,
      })
      .eq('id', newUserId)
  }

  const { data: profile } = await admin
    .from('users')
    .select('id, name, email, phone, avatar_url')
    .eq('id', newUserId)
    .maybeSingle()

  await admin.from('customer_invites').insert({
    walker_id: wp.id,
    invited_user_id: newUserId,
    email: trimmedEmail,
    name: trimmedName,
    result: 'invited',
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        user: profile,
        status: 'invited',
      },
    }),
  }
}
