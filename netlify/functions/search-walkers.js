import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const params = event.queryStringParameters || {}
  const { postcode, service_type, limit: limitStr } = params
  const limit = Math.min(parseInt(limitStr) || 20, 50)

  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'postcode is required' }) }
  }

  // Geocode the search postcode
  let searchLat, searchLng
  try {
    const geoRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`)
    const geoData = await geoRes.json()
    if (geoData.status !== 200 || !geoData.result) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid postcode' }) }
    }
    searchLat = geoData.result.latitude
    searchLng = geoData.result.longitude
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to geocode postcode' }) }
  }

  // Fetch all walkers with coordinates
  const { data: walkers, error: wErr } = await supabase
    .from('walker_profiles')
    .select('id, slug, business_name, bio, theme_color, postcode, lat, lng, cover_url, users(avatar_url)')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('setup_completed_at', 'is', null)

  if (wErr) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch walkers' }) }
  }

  // Compute distance and sort
  let results = (walkers || []).map((w) => ({
    ...w,
    distance_miles: Math.round(haversineDistance(searchLat, searchLng, w.lat, w.lng) * 10) / 10,
  }))

  results.sort((a, b) => a.distance_miles - b.distance_miles)
  results = results.slice(0, limit)

  if (results.length === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [] }),
    }
  }

  // Fetch services and reviews for result walkers
  const walkerIds = results.map((w) => w.id)

  const [{ data: services }, { data: reviews }] = await Promise.all([
    supabase
      .from('services')
      .select('walker_id, name, price_cents, duration_minutes, service_type')
      .in('walker_id', walkerIds)
      .eq('active', true),
    supabase
      .from('reviews')
      .select('walker_id, rating')
      .in('walker_id', walkerIds),
  ])

  // Group services and reviews by walker
  const serviceMap = {}
  const reviewMap = {}
  for (const s of (services || [])) {
    if (!serviceMap[s.walker_id]) serviceMap[s.walker_id] = []
    serviceMap[s.walker_id].push(s)
  }
  for (const r of (reviews || [])) {
    if (!reviewMap[r.walker_id]) reviewMap[r.walker_id] = []
    reviewMap[r.walker_id].push(r.rating)
  }

  // Filter by service type if specified
  if (service_type) {
    results = results.filter((w) => {
      const wServices = serviceMap[w.id] || []
      return wServices.some((s) => s.service_type === service_type)
    })
  }

  // Enrich results
  const enriched = results.map((w) => {
    const wReviews = reviewMap[w.id] || []
    const avgRating = wReviews.length > 0
      ? Math.round((wReviews.reduce((s, r) => s + r, 0) / wReviews.length) * 10) / 10
      : null
    return {
      id: w.id,
      slug: w.slug,
      business_name: w.business_name,
      bio: w.bio,
      theme_color: w.theme_color,
      avatar_url: w.users?.avatar_url || null,
      cover_url: w.cover_url || null,
      postcode: w.postcode,
      distance_miles: w.distance_miles,
      avg_rating: avgRating,
      review_count: wReviews.length,
      services: (serviceMap[w.id] || []).map((s) => ({
        name: s.name,
        price_cents: s.price_cents,
        service_type: s.service_type,
      })),
    }
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: enriched }),
  }
}
