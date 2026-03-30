import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { clientPriceCents } from '../../lib/utils'

export default function PlatformLanding() {
  const [postcode, setPostcode] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [serviceFilter, setServiceFilter] = useState('')
  const [featuredWalkers, setFeaturedWalkers] = useState([])
  const [locating, setLocating] = useState(false)

  // Load featured walkers with reviews on mount (CDN-cached)
  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch('/.netlify/functions/featured-walkers')
        const { data } = await res.json()
        if (data?.length > 0) setFeaturedWalkers(data)
      } catch { /* silent */ }
    }
    loadFeatured()
  }, [])

  // Auto-detect postcode from browser geolocation
  function detectLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.postcodes.io/postcodes?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}&limit=1`)
          const data = await res.json()
          if (data.status === 200 && data.result?.[0]) {
            setPostcode(data.result[0].postcode)
          }
        } catch { /* ignore */ }
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 5000 },
    )
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!postcode.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({ postcode: postcode.trim() })
      if (serviceFilter) params.set('service_type', serviceFilter)
      const res = await fetch(`/.netlify/functions/search-walkers?${params}`)
      const data = await res.json()
      if (data.error) {
        setSearchError(data.error)
        setResults(null)
      } else {
        setResults(data.data || [])
      }
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative text-white py-14 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&h=600&fit=crop" alt="" className="w-full h-full object-cover brightness-[0.35]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl mb-3 drop-shadow-lg">
            Find professional dog walkers near you
          </h1>
          <p className="text-base md:text-lg text-white/90 mb-6">
            Trusted, local dog walkers — book online, pay securely.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="Enter your postcode"
                className="w-full rounded-lg px-4 py-3 bg-white/10 border border-white/40 text-white text-sm focus:ring-2 focus:ring-white/50 focus:border-white outline-none placeholder:text-white/50"
              />
              {!postcode && (
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1 disabled:opacity-50"
                  title="Use my location"
                >
                  {locating ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  )}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching || !postcode.trim()}
              className="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-lg hover:bg-indigo-50 text-sm disabled:opacity-50 shrink-0 transition"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
            <Link
              to="/signup"
              className="border border-white/40 text-white font-semibold px-4 py-3 rounded-lg hover:bg-white/10 text-sm shrink-0 transition whitespace-nowrap"
            >
              I'm a walker
            </Link>
          </form>
          {searchError && (
            <p className="text-sm text-red-200 mt-1">{searchError}</p>
          )}
        </div>
      </section>

      {/* Search results */}
      {results !== null && (
        <section className="bg-gray-50 py-8 md:py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg">
                {results.length > 0 ? `${results.length} walker${results.length !== 1 ? 's' : ''} found` : 'No walkers found'}
              </h2>
              <select
                value={serviceFilter}
                onChange={(e) => { setServiceFilter(e.target.value); setResults(null) }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">All services</option>
                <option value="standard">Dog walking</option>
                <option value="overnight">Overnight</option>
              </select>
            </div>
            {results.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No walkers found near this postcode. Try a different area or check back soon.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((walker) => (
                <Link
                  key={walker.id}
                  to={`/w/${walker.slug}`}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white overflow-hidden"
                      style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                    >
                      {walker.avatar_url ? (
                        <img src={walker.avatar_url} alt={walker.business_name} className="w-full h-full object-cover" />
                      ) : (
                        walker.business_name?.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm">{walker.business_name}</h3>
                      <div className="flex items-center gap-1.5 text-xs">
                        {walker.avg_rating && (
                          <span className="text-yellow-500">
                            {'★'.repeat(Math.round(walker.avg_rating))}
                            <span className="text-gray-400 ml-0.5">({walker.review_count})</span>
                          </span>
                        )}
                        <span className="text-gray-400">{walker.distance_miles} mi</span>
                      </div>
                    </div>
                  </div>
                  {walker.bio && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{walker.bio}</p>
                  )}
                  {walker.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {walker.services.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {s.name} · £{(clientPriceCents(s.price_cents) / 100).toFixed(0)}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials (default view) */}
      {results === null && featuredWalkers.length > 0 && (
        <section className="py-10 md:py-14 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl text-center mb-8">What dog owners are saying</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featuredWalkers
                .filter((w) => w.reviews.length > 0)
                .slice(0, 3)
                .map((walker) => {
                  const review = walker.reviews[0]
                  return (
                    <Link
                      key={walker.id}
                      to={`/w/${walker.slug}`}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition flex flex-col"
                    >
                      <div className="flex items-center gap-2.5 mb-4">
                        <div
                          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                          style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                        >
                          {walker.users?.avatar_url ? (
                            <img src={walker.users.avatar_url} alt={walker.business_name} className="w-full h-full object-cover" />
                          ) : (
                            walker.business_name?.charAt(0)
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{walker.business_name}</p>
                          <div className="text-yellow-400 text-xs">{'★'.repeat(Math.round(walker.avg_rating))}</div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-base leading-relaxed flex-1">
                        "{review.comment}"
                      </p>
                      <p className="text-sm text-gray-400 mt-4">— {review.users?.name}</p>
                    </Link>
                  )
                })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
