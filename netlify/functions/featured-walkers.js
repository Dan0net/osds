import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

export async function handler() {
  const { data: walkers, error: wErr } = await supabase
    .from('walker_profiles')
    .select('id, slug, business_name, bio, theme_color, postcode, users(avatar_url)')
    .not('lat', 'is', null)
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
  const { data: reviews } = await supabase
    .from('reviews')
    .select('walker_id, rating, comment, created_at, users(name)')
    .in('walker_id', ids)
    .order('created_at', { ascending: false })

  const revMap = {}
  for (const r of (reviews || [])) {
    if (!revMap[r.walker_id]) revMap[r.walker_id] = []
    revMap[r.walker_id].push(r)
  }

  const data = walkers.map((w) => {
    const wRevs = revMap[w.id] || []
    return {
      ...w,
      reviews: wRevs.slice(0, 2),
      avg_rating: wRevs.length > 0 ? Math.round((wRevs.reduce((s, r) => s + r.rating, 0) / wRevs.length) * 10) / 10 : null,
      review_count: wRevs.length,
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
