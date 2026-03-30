import { createClient } from '@supabase/supabase-js'
import { emailTemplate, notify } from './lib/notify.js'

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

  // Check if user is a walker
  const { data: wp } = await adminSupabase
    .from('walker_profiles')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (wp) {
    // Walker welcome email
    await notify(adminSupabase, user.id, {
      type: 'booking_approved', // reuse existing pref key for welcome
      title: 'Your page is live!',
      body: 'Share your page with clients to start receiving bookings.',
      link: '/account',
      emailSubject: 'Your page is live — One Stop Dog Shop',
      emailHtml: emailTemplate(
        'Your page is live!',
        [
          'Your booking page is ready to share with clients. Start by creating a booking for an existing client or sharing your link.',
          `<strong>Your page:</strong> <a href="${siteUrl}/w/${wp.slug}">${wp.slug}.onestopdog.shop</a>`,
        ],
        'View your page',
        `${siteUrl}/w/${wp.slug}`,
      ),
    })
  } else {
    // Owner welcome email
    await notify(adminSupabase, user.id, {
      type: 'booking_approved', // reuse existing pref key for welcome
      title: 'Welcome to One Stop Dog Shop!',
      body: 'Find trusted local dog walkers near you.',
      link: '/',
      emailSubject: 'Welcome to One Stop Dog Shop',
      emailHtml: emailTemplate(
        'Welcome to One Stop Dog Shop!',
        [
          "You're all set! Find trusted local dog walkers near you and book directly — no middleman.",
        ],
        'Find walkers near me',
        siteUrl,
      ),
    })
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { ok: true } }),
  }
}
