import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clientPriceCents } from '../../lib/utils'

export default function PlatformLanding() {
  const [postcode, setPostcode] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [serviceFilter, setServiceFilter] = useState('')

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
      {/* Hero with search */}
      <section className="bg-indigo-600 text-white py-10 md:py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Find dog walkers near you
          </h1>
          <p className="text-sm md:text-base text-indigo-100 mb-5">
            Enter your postcode to find trusted, local dog walkers.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="Enter postcode"
              className="flex-1 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-white text-indigo-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-50 text-sm disabled:opacity-50 shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchError && (
            <p className="text-sm text-red-200 mt-2">{searchError}</p>
          )}
        </div>
      </section>

      {/* Search results */}
      {results !== null && (
        <section className="bg-gray-50 py-8 md:py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
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
                      className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                    >
                      {walker.business_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{walker.business_name}</h3>
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

      {/* How it works (shown when no search results) */}
      {results === null && (
        <>
          <section className="py-8 md:py-10 px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-center mb-6">How it works</h2>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {[
                  { step: '1', title: 'Find your walker', desc: 'Search by postcode, read reviews, and check availability.' },
                  { step: '2', title: 'Book & pay online', desc: 'Pick a service, choose your slot, and pay securely.' },
                  { step: '3', title: 'Happy pup, happy you', desc: 'Your walker confirms. Track everything from your dashboard.' },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-9 h-9 bg-indigo-100 text-indigo-600 font-bold text-sm rounded-full flex items-center justify-center mx-auto mb-2">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-600 hidden sm:block">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* For walkers */}
      <section className="py-8 md:py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-lg font-bold mb-2">Are you a dog walker?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Get your own booking page, manage your schedule, accept payments —
            all in one place. No monthly fees.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
          >
            Get started for free
          </Link>
        </div>
      </section>
    </div>
  )
}
