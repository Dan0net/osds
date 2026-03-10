import { Link } from 'react-router-dom'

export default function Confirmation() {
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

      <div className="bg-white border border-gray-200 rounded-lg p-4 text-left space-y-2 mb-8">
        <div className="flex justify-between">
          <span className="text-gray-500">Service</span>
          <span className="font-semibold">30-Minute Walk</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pet</span>
          <span className="font-semibold">Max</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date</span>
          <span className="font-semibold">Monday, 16 March</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Time</span>
          <span className="font-semibold">10:00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded">
            Requested
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/my-bookings"
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
