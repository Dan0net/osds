import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function WalkerDirectory() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(initialQuery)
  const [walkers, setWalkers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWalkers()
  }, [])

  async function loadWalkers() {
    setLoading(true)
    const { data } = await supabase
      .from('walker_profiles')
      .select('id, slug, business_name, bio, city, postcode, theme_color, user_id')
      .order('created_at', { ascending: false })
    setWalkers(data || [])
    setLoading(false)
  }

  const filtered = search.trim()
    ? walkers.filter((w) => {
        const q = search.toLowerCase()
        return (
          (w.business_name || '').toLowerCase().includes(q) ||
          (w.city || '').toLowerCase().includes(q) ||
          (w.postcode || '').toLowerCase().includes(q) ||
          (w.bio || '').toLowerCase().includes(q)
        )
      })
    : walkers

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Find a walker</h1>
      <p className="text-sm text-gray-500 mb-6">Browse local dog walkers and book online.</p>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, or postcode..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No walkers found{search ? ` matching "${search}"` : ''}.</p>
          {search && (
            <button onClick={() => setSearch('')} className="text-sm text-indigo-600 hover:underline">Clear search</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((walker) => (
            <Link
              key={walker.id}
              to={`/w/${walker.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                >
                  {walker.business_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{walker.business_name}</h3>
                  {walker.city && (
                    <p className="text-xs text-gray-500">{walker.city}{walker.postcode ? `, ${walker.postcode}` : ''}</p>
                  )}
                </div>
              </div>
              {walker.bio && (
                <p className="text-xs text-gray-600 line-clamp-3">{walker.bio}</p>
              )}
              <p className="text-xs text-indigo-600 font-medium mt-2">View profile →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
