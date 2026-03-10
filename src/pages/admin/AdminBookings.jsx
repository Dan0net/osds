import { useState } from 'react'
import { MOCK_BOOKINGS } from '../../lib/mockData'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState(MOCK_BOOKINGS)

  function updateStatus(id, status) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold">{booking.service_name}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-600">{booking.client_name}</span>
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

            <div className="text-sm text-gray-500 mb-3">
              {new Date(booking.booking_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {booking.start_time}–{booking.end_time} ·{' '}
              £{(booking.price_cents / 100).toFixed(2)}
            </div>

            {booking.status === 'requested' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(booking.id, 'confirmed')}
                  className="bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(booking.id, 'declined')}
                  className="bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
