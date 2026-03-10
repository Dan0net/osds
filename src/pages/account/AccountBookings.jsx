import { useState } from 'react'
import { MOCK_USER, MOCK_BOOKINGS, MOCK_CLIENT_BOOKINGS, MOCK_WALKERS } from '../../lib/mockData'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function AccountBookings() {
  const [tab, setTab] = useState(MOCK_USER.has_walker_profile ? 'incoming' : 'mine')
  const [incoming, setIncoming] = useState(MOCK_BOOKINGS)
  const [mine] = useState(MOCK_CLIENT_BOOKINGS)
  const [favourites] = useState(
    MOCK_WALKERS.filter((w) => MOCK_USER.favourite_walkers.includes(w.id)),
  )

  function updateStatus(id, status) {
    setIncoming((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      {/* Tabs */}
      {MOCK_USER.has_walker_profile && (
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab('incoming')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              tab === 'incoming' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Incoming requests
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            My bookings
          </button>
        </div>
      )}

      {/* Incoming requests (walker view) */}
      {tab === 'incoming' && (
        <div className="space-y-3">
          {incoming.map((b) => (
            <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-semibold">{b.service_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{b.client_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">{b.pet_name}</span>
                </div>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{b.start_time}–{b.end_time}
                {' · '}£{(b.price_cents / 100).toFixed(2)}
              </div>
              {b.status === 'requested' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(b.id, 'confirmed')}
                    className="bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(b.id, 'declined')}
                    className="bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* My bookings (client view) */}
      {tab === 'mine' && (
        <>
          <div className="space-y-3 mb-10">
            {mine.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{b.service_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{b.walker_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500">{b.pet_name}</span>
                  </div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}{b.start_time}–{b.end_time}
                  {' · '}£{(b.price_cents / 100).toFixed(2)}
                </div>
                {(b.status === 'requested' || b.status === 'confirmed') && (
                  <button className="mt-2 text-sm text-red-500 hover:text-red-600">Cancel</button>
                )}
              </div>
            ))}
            {mine.length === 0 && (
              <p className="text-gray-400 text-center py-8">No bookings yet.</p>
            )}
          </div>

          {/* Favourites */}
          {favourites.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-4">Favourite Walkers</h2>
              <div className="space-y-2">
                {favourites.map((w) => (
                  <div key={w.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {w.business_name.charAt(0)}
                      </div>
                      <span className="font-semibold">{w.business_name}</span>
                    </div>
                    <a href={`/w/${w.slug}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                      View page
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
