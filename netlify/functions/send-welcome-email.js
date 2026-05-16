import { createClient } from '@supabase/supabase-js'
import { emailTemplate, esc, sendEmail } from './lib/notify.js'

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

  const adminSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const siteUrl = process.env.SITE_URL || 'https://onestopdog.shop'

  const { data: wp } = await adminSupabase
    .from('walker_profiles')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: profile } = await adminSupabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile?.email) {
    return { statusCode: 200, body: JSON.stringify({ data: { ok: true } }) }
  }

  if (wp) {
    await sendEmail(
      profile.email,
      'Your page is live — One Stop Dog Shop',
      emailTemplate(
        'Your page is live!',
        [
          'Your booking page is ready to share with clients. Start by creating a booking for an existing client or sharing your link.',
          `<strong>Your page:</strong> <a href="${siteUrl}/w/${esc(wp.slug)}">${esc(wp.slug)}.onestopdog.shop</a>`,
        ],
        'View your page',
        `${siteUrl}/w/${wp.slug}`,
      ),
    )
  } else {
    await sendEmail(
      profile.email,
      'Welcome to One Stop Dog Shop',
      emailTemplate(
        'Welcome to One Stop Dog Shop!',
        [
          "You're all set! Find trusted local dog walkers near you and book directly — no middleman.",
        ],
        'Find walkers near me',
        siteUrl,
      ),
    )
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { ok: true } }),
  }
}
