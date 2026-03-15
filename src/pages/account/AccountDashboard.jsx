import { Link } from 'react-router-dom'
import { MOCK_USER, MOCK_BOOKINGS, MOCK_CLIENT_BOOKINGS, MOCK_WALKERS } from '../../lib/mockData'

export default function AccountDashboard() {
  const upcomingAsClient = MOCK_CLIENT_BOOKINGS.filter(
    (b) => b.status === 'confirmed' || b.status === 'requested',
  )
  const pendingRequests = MOCK_BOOKINGS.filter((b) => b.status === 'requested')
  const confirmedWalkerBookings = MOCK_BOOKINGS.filter((b) => b.status === 'confirmed')
  const totalRevenueCents = confirmedWalkerBookings.reduce((sum, b) => sum + b.price_cents, 0)
  const walkerProfile = MOCK_WALKERS.find((w) => w.slug === 'ellie')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Upcoming</p>
          <p className="text-xl font-bold mt-0.5">{upcomingAsClient.length}</p>
        </div>
        {MOCK_USER.has_walker_profile && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold mt-0.5">{pendingRequests.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold mt-0.5">{MOCK_BOOKINGS.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Rating</p>
              <p className="text-xl font-bold mt-0.5">
                <span className="text-yellow-400 mr-0.5">★</span>{walkerProfile?.rating || '4.7'}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-xl font-bold mt-0.5">£{(totalRevenueCents / 100).toFixed(0)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-0">
              <p className="text-xs text-gray-500">Walker page</p>
              <a href="https://ellie.onestopdog.shop" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline mt-0.5 inline-block break-all">
                ellie.onestopdog.shop
              </a>
            </div>
          </>
        )}
      </div>

      {/* Upcoming client bookings */}
      {upcomingAsClient.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your upcoming bookings</h2>
            <Link to="/account/bookings" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingAsClient.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{b.service_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{b.walker_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending walker requests */}
      {MOCK_USER.has_walker_profile && pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Incoming requests</h2>
            <Link to="/account/bookings" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {pendingRequests.slice(0, 3).map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{b.client_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{b.service_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded">
                  requested
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          {[
            { text: 'Dan requested a 30-Minute Walk for Max', time: '2 hours ago', icon: '📩' },
            { text: 'Dan requested a Bath & Groom for Max', time: '2 hours ago', icon: '📩' },
            { text: 'You booked a Group Walk with James\'s Paw Patrol', time: '1 day ago', icon: '✅' },
            { text: 'Dan\'s 60-Minute Walk was confirmed', time: '3 days ago', icon: '💳' },
          ].map((item, i) => (
            <div key={i} className="p-3 flex items-start gap-3">
              <span className="text-lg shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
