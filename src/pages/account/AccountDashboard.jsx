import { Link } from 'react-router-dom'
import { MOCK_USER, MOCK_BOOKINGS, MOCK_CLIENT_BOOKINGS } from '../../lib/mockData'

export default function AccountDashboard() {
  const upcomingAsClient = MOCK_CLIENT_BOOKINGS.filter(
    (b) => b.status === 'confirmed' || b.status === 'requested',
  )
  const pendingRequests = MOCK_BOOKINGS.filter((b) => b.status === 'requested')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Your upcoming bookings</p>
          <p className="text-2xl font-bold mt-1">{upcomingAsClient.length}</p>
        </div>

        {MOCK_USER.has_walker_profile && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Pending requests</p>
              <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Walker page</p>
              <p className="text-sm font-medium text-indigo-600 mt-1">
                ellie.onestopdog.shop
              </p>
            </div>
          </>
        )}
      </div>

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

      {/* Upcoming client bookings */}
      {upcomingAsClient.length > 0 && (
        <div>
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
    </div>
  )
}
