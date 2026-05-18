import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

export async function handler() {
  const { data: walkers, error: wErr } = await supabase
    .from('walker_profiles')
    .select('id, slug, business_name, bio, theme_color, postcode, cover_url, users(avatar_url)')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('stripe_account_id', 'is', null)
    .eq('stripe_charges_enabled', true)
    .limit(10)

  if (wErr || !walkers || walkers.length === 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
      body: JSON.stringify({ data: [] }),
    }
  }

  const ids = walkers.map((w) => w.id)
  const [{ data: reviews }, { data: services }] = await Promise.all([
    supabase
      .from('reviews')
      .select('walker_id, rating, comment, created_at, users(name)')
      .in('walker_id', ids)
      .order('created_at', { ascending: false }),
    supabase
      .from('services')
      .select('walker_id, name, price_cents, service_type')
      .in('walker_id', ids)
      .eq('active', true),
  ])

  const revMap = {}
  for (const r of (reviews || [])) {
    if (!revMap[r.walker_id]) revMap[r.walker_id] = []
    revMap[r.walker_id].push(r)
  }
  const svcMap = {}
  for (const s of (services || [])) {
    if (!svcMap[s.walker_id]) svcMap[s.walker_id] = []
    svcMap[s.walker_id].push(s)
  }

  const data = walkers.map((w) => {
    const wRevs = revMap[w.id] || []
    const { users, ...rest } = w
    return {
      ...rest,
      avatar_url: users?.avatar_url || null,
      reviews: wRevs.slice(0, 2),
      avg_rating: wRevs.length > 0 ? Math.round((wRevs.reduce((s, r) => s + r.rating, 0) / wRevs.length) * 10) / 10 : null,
      review_count: wRevs.length,
      services: (svcMap[w.id] || []).map((s) => ({ name: s.name, price_cents: s.price_cents, service_type: s.service_type })),
    }
  })

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
    body: JSON.stringify({ data }),
  }
}
