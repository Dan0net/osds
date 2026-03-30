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
            sessionStorage.setItem('osds_postcode', data.result[0].postcode)
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
    sessionStorage.setItem('osds_postcode', postcode.trim())
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
      <section className="relative text-white py-16 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&h=600&fit=crop" alt="" className="w-full h-full object-cover brightness-[0.85]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="font-display font-normal text-3xl md:text-4xl mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Find a trusted local dog walker
          </h1>
          <p className="text-base md:text-xl text-white/90 mb-8">
            Book directly with experienced walkers in your area — no middleman markup.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="Enter your postcode"
                  className="w-full rounded-lg pl-4 pr-12 py-3 bg-white/10 border border-white/40 text-white text-sm focus:ring-2 focus:ring-white/50 focus:border-white outline-none placeholder:text-white/50"
                />
                {!postcode && (
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 disabled:opacity-50"
                    title="Use my location"
                  >
                    {locating ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
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
            </div>
            <Link
              to={`/signup?role=walker${postcode.trim() ? `&postcode=${encodeURIComponent(postcode.trim())}` : ''}`}
              className="inline-block mt-3 border border-white/40 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-white/10 text-sm transition whitespace-nowrap"
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
        <section className="bg-gray-50 py-10 md:py-14 px-4">
          <div className="max-w-5xl mx-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* For dog owners */}
      {results === null && (
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl text-center mb-3">Your dog deserves better than a gig worker</h2>
            <p className="text-gray-500 text-center mb-10 md:mb-14 max-w-2xl mx-auto">
              Every walker on here runs dog care as their livelihood — not a side hustle between other jobs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                </div>
                <h3 className="text-lg mb-2">Real businesses, not profiles</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Each walker has their own site with services, pricing, reviews, and real-time availability. You know exactly who you're booking.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                </div>
                <h3 className="text-lg mb-2">Book and pay directly</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Pick a slot, pay securely, done. No waiting for replies, no app-only messaging chains, no platform in the middle.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                </div>
                <h3 className="text-lg mb-2">Lower prices, no markup</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Other platforms add 30%+ on top of the walker's price. Here, walkers keep more — so you pay less for the same quality care.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* For walkers */}
      {results === null && (
        <section className="bg-gray-50 py-12 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl text-center mb-3">Your business, your way</h2>
            <p className="text-gray-500 text-center mb-10 md:mb-14 max-w-2xl mx-auto">
              Stop renting space on someone else's platform. Get your own booking site and keep the money you earn.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                </div>
                <h3 className="text-base mb-2">Your own booking site</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  yourname.onestopdog.shop — a branded page where clients find you, book, and pay. Not a listing buried in search results.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                </div>
                <h3 className="text-base mb-2">Bookings and calendar sync</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Approve requests, manage availability, and sync with Google or Apple Calendar. No double-bookings.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
                <h3 className="text-base mb-2">Tax-ready from day one</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Every payment tracked with Stripe receipts and full history. Self-assessment sorted.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                </div>
                <h3 className="text-base mb-2">Keep 95% of every booking</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Just 5% + Stripe processing. No monthly fees, no lock-in. Other platforms take 30% or more.
                </p>
              </div>
            </div>
            <div className="text-center mt-10">
              <Link
                to={`/signup?role=walker${postcode.trim() ? `&postcode=${encodeURIComponent(postcode.trim())}` : ''}`}
                className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Create your page — it's free
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials (default view) */}
      {results === null && featuredWalkers.length > 0 && (
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl text-center mb-10">What dog owners are saying</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                          {walker.avatar_url ? (
                            <img src={walker.avatar_url} alt={walker.business_name} className="w-full h-full object-cover" />
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
