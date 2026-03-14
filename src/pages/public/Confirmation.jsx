import { Link, useLocation } from 'react-router-dom'

export default function Confirmation() {
  const location = useLocation()
  const { slots = [], pet, totalCents = 0 } = location.state || {}

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
        ✓
      </div>
      <h1 className="text-2xl font-bold mb-2">Booking request submitted!</h1>
      <p className="text-gray-600 mb-8">
        Your walker will review your request and get back to you soon. You'll
        receive an email once it's approved with a link to pay.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg text-left divide-y mb-8">
        {slots.length > 0 ? (
          <>
            {slots.map((slot, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-semibold">{slot.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold">
                    {new Date(slot.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    {slot.isOvernight && slot.endDate && (
                      <>
                        {' → '}
                        {new Date(slot.endDate).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold">
                    {slot.isOvernight
                      ? `Drop-off ${slot.time} · Pick-up ${slot.endTime}`
                      : `${slot.time}–${slot.endTime}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span className="font-semibold text-indigo-600">
                    £{(slot.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            <div className="p-4 space-y-2">
              {pet && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pet</span>
                  <span className="font-semibold">{pet.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-indigo-600">
                  £{(totalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded">
                  Requested
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">
            Booking details unavailable.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/account/bookings"
          className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700"
        >
          View my bookings
        </Link>
        <Link
          to="/"
          className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
