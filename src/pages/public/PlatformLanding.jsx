import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MOCK_WALKERS } from '../../lib/mockData'

export default function PlatformLanding() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [walkers, setWalkers] = useState([])

  useEffect(() => {
    async function loadFeatured() {
      const { data } = await supabase
        .from('walker_profiles')
        .select('id, slug, business_name, bio, theme_color, city')
        .limit(6)
      if (data && data.length > 0) {
        setWalkers(data)
      } else {
        // Fall back to mock data if no real walkers yet
        setWalkers(MOCK_WALKERS)
      }
    }
    loadFeatured()
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    navigate(`/walkers${search ? `?q=${encodeURIComponent(search)}` : ''}`)
  }

  return (
    <div>
      {/* Hero — for pet owners */}
      <section className="bg-indigo-600 text-white py-10 md:py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Find trusted dog walkers near you
          </h1>
          <p className="text-sm md:text-base text-indigo-100 mb-5">
            Book local, vetted walkers online. Pay securely. Keep your pup happy.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter your city or postcode"
              className="flex-1 rounded-lg px-4 py-2.5 text-gray-800 text-sm outline-none focus:ring-2 focus:ring-white"
            />
            <button type="submit" className="bg-white text-indigo-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-50 text-sm shrink-0">
              Search
            </button>
          </form>
          <Link to="/walkers" className="inline-block text-indigo-200 hover:text-white text-xs mt-3 underline">
            Browse all walkers
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-8 md:py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-6">How it works</h2>
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              { step: '1', title: 'Find your walker', desc: 'Search by location, browse profiles, and read reviews.' },
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

      {/* Featured walkers */}
      <section className="bg-gray-100 py-8 md:py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-5">Featured walkers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {walkers.slice(0, 6).map((walker) => (
              <Link
                key={walker.id || walker.slug}
                to={`/w/${walker.slug}`}
                className="bg-white rounded-lg p-4 hover:shadow-md transition flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0"
              >
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 sm:mx-auto sm:mb-2 flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                >
                  {walker.business_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{walker.business_name}</h3>
                  {walker.city && <p className="text-xs text-gray-500">{walker.city}</p>}
                  {walker.rating && (
                    <div className="text-yellow-400 text-xs">
                      {'★'.repeat(Math.round(walker.rating))}
                      <span className="text-gray-400 ml-1">({walker.review_count})</span>
                    </div>
                  )}
                  {walker.bio && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{walker.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link to="/walkers" className="text-sm text-indigo-600 hover:underline font-medium">View all walkers →</Link>
          </div>
        </div>
      </section>

      {/* For walkers — promoted section */}
      <section className="py-10 md:py-14 px-4 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-3">Are you a dog walker?</h2>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Get your own booking page, manage your schedule, and accept secure payments — all in one place. No monthly fees.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl mb-1">📅</div>
              <p className="text-xs text-gray-700 font-medium">Manage schedule</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">💷</div>
              <p className="text-xs text-gray-700 font-medium">Get paid securely</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📈</div>
              <p className="text-xs text-gray-700 font-medium">Grow your business</p>
            </div>
          </div>
          <Link
            to="/signup?role=walker"
            className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
          >
            Start walking
          </Link>
        </div>
      </section>
    </div>
  )
}
