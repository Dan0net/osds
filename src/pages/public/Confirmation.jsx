import { Link, useLocation, useSearchParams, useParams } from 'react-router-dom'
import { resolveWalker } from '../../lib/walker'
import { CheckCircle, Clock, Moon, ArrowLeft } from 'lucide-react'

export default function Confirmation() {
  const { walker: walkerParam } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { slots = [], pet, totalCents = 0, walkerSlug } = location.state || {}
  const resolvedSlug = walkerSlug || slug

  const sessionId = searchParams.get('session_id')
  const isPaymentSuccess = !!sessionId

  if (isPaymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Payment successful!</h1>
          <p className="text-gray-500 text-sm">
            Your booking is now confirmed. You'll receive a confirmation email shortly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/account/bookings"
            className="cursor-pointer text-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 text-sm"
          >
            View my bookings
          </Link>
          {resolvedSlug && (
            <Link
              to={`/w/${resolvedSlug}`}
              className="cursor-pointer text-center border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 text-sm"
            >
              Back to walker
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Success header */}
      <div className="text-center mb-8">
        <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Booking request submitted!</h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Your walker will review your request and get back to you soon.
          You'll receive an email once it's approved with a link to pay.
        </p>
      </div>

      {/* Booking summary card */}
      {slots.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
          <div className="divide-y divide-gray-100">
            {slots.map((slot, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {slot.isOvernight ? <Moon size={14} className="text-gray-500" /> : <Clock size={14} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{slot.serviceName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {slot.isOvernight && slot.endDate ? (
                        <> → {new Date(slot.endDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</>
                      ) : null}
                      {' · '}
                      {slot.isOvernight
                        ? `Drop-off ${slot.time} · Pick-up ${slot.endTime}`
                        : `${slot.time}–${slot.endTime}`}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">£{(slot.priceCents / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {pet && <span className="text-sm text-gray-500">Pet: <span className="font-medium text-gray-700">{pet.name}</span></span>}
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full">Requested</span>
                <span className="text-sm font-semibold">£{(totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/account/bookings"
          className="cursor-pointer text-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 text-sm"
        >
          View my bookings
        </Link>
        {resolvedSlug && (
          <Link
            to={`/w/${resolvedSlug}`}
            className="cursor-pointer text-center border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to walker
          </Link>
        )}
      </div>
    </div>
  )
}
