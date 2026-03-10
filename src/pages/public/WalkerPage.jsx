import { useParams } from 'react-router-dom'
import { getWalkerBySlug, getServicesByWalkerId, getReviewsByWalkerId } from '../../lib/mockData'
import { resolveWalker } from '../../lib/walker'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'

function StarRating({ rating }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function WalkerPage() {
  const { walker: walkerParam } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const walker = getWalkerBySlug(slug)
  const services = getServicesByWalkerId(walker?.id)
  const reviews = getReviewsByWalkerId(walker?.id)
  const prefix = walkerParam ? `/w/${walkerParam}` : ''

  if (!walker) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Walker not found</h1>
        <p className="text-gray-500">We couldn't find a walker with that name.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-indigo-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-24 h-24 bg-indigo-400 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
            {walker.business_name.charAt(0)}
          </div>
          <h1 className="text-3xl font-bold mb-2">{walker.business_name}</h1>
          <p className="text-indigo-100 max-w-xl mx-auto">{walker.bio}</p>
        </div>
      </section>

      {/* Services */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Services</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {services.filter((s) => s.active).map((service) => (
              <div
                key={service.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold">{service.name}</h3>
                  <span className="text-indigo-600 font-bold">
                    £{(service.price_cents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {service.duration_minutes} minutes
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability Calendar */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Book a slot</h2>
          <AvailabilityCalendar services={services} />
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Reviews</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold">{review.client_name}</span>
                    <span className="ml-2">
                      <StarRating rating={review.rating} />
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">{review.created_at}</span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
