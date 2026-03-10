import { useState } from 'react'
import { MOCK_BOOKINGS, MOCK_WALKER } from '../../lib/mockData'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function MyBookings() {
  const [bookings] = useState(MOCK_BOOKINGS)
  const [favourites] = useState([MOCK_WALKER])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {/* Bookings list */}
      <div className="space-y-3 mb-10">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold">{booking.service_name}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-500">{booking.pet_name}</span>
              </div>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                  STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {booking.status}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {booking.start_time}–{booking.end_time} ·{' '}
              £{(booking.price_cents / 100).toFixed(2)}
            </div>
            {(booking.status === 'requested' || booking.status === 'confirmed') && (
              <button className="mt-2 text-sm text-red-500 hover:text-red-600">
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Favourites */}
      <h2 className="text-xl font-bold mb-4">Favourite Walkers</h2>
      <div className="space-y-2">
        {favourites.map((walker) => (
          <div
            key={walker.id}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                {walker.business_name.charAt(0)}
              </div>
              <span className="font-semibold">{walker.business_name}</span>
            </div>
            <a
              href={`/w/${walker.slug}`}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View page
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
