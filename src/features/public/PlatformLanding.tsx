import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { clientPriceCents } from '@/utils/pricing'
import Alert from '@/shared/Alert'
import { formatGBP } from '@/utils/formatting'

function WalkerCard({ walker, showDistance }) {
  const lowestPrice = walker.services?.length > 0
    ? Math.min(...walker.services.map((s) => clientPriceCents(s.price_cents)))
    : null

  return (
    <Link to={`/w/${walker.slug}`} className="group cursor-pointer">
      {/* Cover / avatar area */}
      <div
        className="aspect-[4/3] rounded-xl overflow-hidden mb-3 relative"
        style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
      >
        {walker.cover_url ? (
          <img src={walker.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : walker.avatar_url ? (
          <img src={walker.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white text-5xl font-bold opacity-50">{walker.business_name?.charAt(0)}</span>
          </div>
        )}
        {walker.avg_rating && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span>{walker.avg_rating}</span>
            <span className="text-gray-400">({walker.review_count})</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{walker.business_name}</h3>
          {walker.bio && (
            <p className="text-sm text-gray-500 truncate">{walker.bio}</p>
          )}
          {showDistance && walker.distance_miles != null && (
            <p className="text-sm text-gray-400">{walker.distance_miles} miles away</p>
          )}
          {!showDistance && walker.postcode && (
            <p className="text-sm text-gray-400">{walker.postcode}</p>
          )}
        </div>
        {lowestPrice && (
          <p className="text-sm text-gray-900 shrink-0 ml-2">
            <span className="font-semibold">{formatGBP(lowestPrice, { smart: true })}</span>
            <span className="text-gray-500 font-normal"> / visit</span>
          </p>
        )}
      </div>
      {walker.services?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {walker.services.slice(0, 3).map((s, i) => (
            <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{s.name}</span>
          ))}
        </div>
      )}
    </Link>
  )
}

export default function PlatformLanding() {
  const { profile } = useAuth()
  const [postcode, setPostcode] = useState('')
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [locating, setLocating] = useState(false)

  // Prefill postcode for logged-in users
  useEffect(() => {
    if (profile?.postcode) {
      setPostcode(profile.postcode)
    }
  }, [profile?.postcode])

  // Load walkers on mount — if logged-in with postcode, search by postcode; otherwise load featured
  useEffect(() => {
    if (profile?.postcode) {
      searchByPostcode(profile.postcode)
    } else {
      loadAllWalkers()
    }
  }, [profile?.postcode])

  async function loadAllWalkers() {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/featured-walkers')
      const { data } = await res.json()
      setWalkers(data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  async function searchByPostcode(pc) {
    if (!pc?.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/.netlify/functions/search-walkers?postcode=${encodeURIComponent(pc.trim())}`)
      const data = await res.json()
      if (data.error) {
        setSearchError(data.error)
        if (!hasSearched) loadAllWalkers()
      } else {
        setWalkers(data.data || [])
        setHasSearched(true)
      }
    } catch {
      setSearchError('Search failed. Please try again.')
      if (!hasSearched) loadAllWalkers()
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!postcode.trim()) return
    sessionStorage.setItem('osds_postcode', postcode.trim())
    searchByPostcode(postcode.trim())
  }

  function detectLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.postcodes.io/postcodes?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}&limit=1`)
          const data = await res.json()
          if (data.status === 200 && data.result?.[0]) {
            const pc = data.result[0].postcode
            setPostcode(pc)
            sessionStorage.setItem('osds_postcode', pc)
            searchByPostcode(pc)
          }
        } catch { /* ignore */ }
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 5000 },
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <form onSubmit={handleSearch} className="py-3 flex items-center justify-center gap-3">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="Search by postcode"
                className="w-full rounded-full border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm hover:shadow-md transition"
              />
              {!postcode && (
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
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
              className="cursor-pointer bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-full hover:bg-indigo-700 text-sm disabled:opacity-50 shrink-0 transition shadow-sm"
            >
              {searching ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" /></svg>
              ) : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {searchError && <Alert className="mb-4">{searchError}</Alert>}

        {/* Results header */}
        {!loading && (
          <div className="mb-6">
            {hasSearched ? (
              <h2 className="text-lg font-semibold">
                {walkers.length > 0
                  ? `${walkers.length} walker${walkers.length !== 1 ? 's' : ''} near ${postcode}`
                  : 'No walkers found'}
              </h2>
            ) : (
              <h2 className="text-lg font-semibold">Walkers on One Stop Dog Shop</h2>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:snap-none sm:pb-0">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="animate-pulse min-w-[45%] snap-start sm:min-w-0">
                <div className="aspect-[4/3] rounded-xl bg-gray-200 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Walker grid — 6 cols desktop, horizontal scroll on mobile */}
        {!loading && walkers.length > 0 && (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:snap-none sm:pb-0 scrollbar-hide">
            {walkers.map((walker) => (
              <div key={walker.id} className="min-w-[45%] snap-start sm:min-w-0">
                <WalkerCard walker={walker} showDistance={hasSearched} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && walkers.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🐾</div>
            <h3 className="text-lg font-semibold mb-2">No walkers found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {hasSearched ? 'Try a different postcode or check back soon.' : 'Walkers will appear here once they sign up.'}
            </p>
            <Link
              to="/signup?role=walker"
              className="cursor-pointer inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
            >
              Become a walker
            </Link>
          </div>
        )}

        {/* Become a walker CTA — shown at bottom when walkers exist */}
        {!loading && walkers.length > 0 && (
          <div className="border-t border-gray-100 mt-12 pt-10 pb-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Are you a dog walker?</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              Create your own booking page, keep 95% of every booking, and manage your business your way.
            </p>
            <Link
              to={`/signup?role=walker${postcode.trim() ? `&postcode=${encodeURIComponent(postcode.trim())}` : ''}`}
              className="cursor-pointer inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
            >
              Create your page — it's free
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
