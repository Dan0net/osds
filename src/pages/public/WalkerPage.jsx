import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { resolveWalker } from '../../lib/walker'
import { useAuth } from '../../hooks/useAuth'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'

function StarRating({ rating }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

import { clientPriceCents } from '../../lib/utils'

export default function WalkerPage() {
  const { walker: walkerParam } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const { user, profile, refreshProfile } = useAuth()
  const [walker, setWalker] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFavourite, setIsFavourite] = useState(false)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    async function load() {
      const { data: wp, error: wpErr } = await supabase
        .from('walker_profiles')
        .select('*, users(name, avatar_url)')
        .eq('slug', slug)
        .single()

      if (wpErr || !wp) {
        setError('Walker not found')
        setLoading(false)
        return
      }

      setWalker(wp)

      const [svcRes, revRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('walker_id', wp.id)
          .eq('active', true),
        supabase
          .from('reviews')
          .select('*, users(name)')
          .eq('walker_id', wp.id)
          .order('created_at', { ascending: false }),
      ])

      setServices(svcRes.data || [])
      setReviews(revRes.data || [])
      setLoading(false)
    }

    load()
  }, [slug])

  // Check if walker is in favourites
  useEffect(() => {
    if (walker && profile?.favourite_walkers) {
      setIsFavourite(profile.favourite_walkers.includes(walker.id))
    }
  }, [walker?.id, profile?.favourite_walkers])

  async function toggleFavourite() {
    if (!user || !walker) return
    const favs = profile?.favourite_walkers || []
    const newFavs = isFavourite
      ? favs.filter((id) => id !== walker.id)
      : [...favs, walker.id]
    setIsFavourite(!isFavourite)
    await supabase.from('users').update({ favourite_walkers: newFavs }).eq('id', user.id)
    refreshProfile()
  }

  // Compute rating summary
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !walker) {
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
      <section className="bg-indigo-600 text-white py-8 md:py-10 px-4">
        <div className="max-w-2xl mx-auto text-center relative">
          {user && (
            <button
              onClick={toggleFavourite}
              className="absolute top-0 right-0 text-2xl hover:scale-110 transition"
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              {isFavourite ? '❤️' : '🤍'}
            </button>
          )}
          <div
            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: walker.theme_color || '#818cf8' }}
          >
            {walker.business_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold mb-1">{walker.business_name}</h1>
          {avgRating && (
            <div className="flex items-center justify-center gap-1.5 text-sm mb-1">
              <span className="text-yellow-300">{'★'.repeat(Math.round(avgRating))}</span>
              <span className="text-indigo-200">{avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
          <p className="text-sm text-indigo-100 max-w-md mx-auto">{walker.bio}</p>
        </div>
      </section>

      {/* Services */}
      <section className="py-6 md:py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold mb-3">Services</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {services.filter((s) => s.active).map((service) => (
              <div
                key={service.id}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm">{service.name}</h3>
                  <span className="text-indigo-600 font-bold text-sm">
                    £{(clientPriceCents(service.price_cents) / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {service.service_type === 'overnight'
                    ? 'per night'
                    : `${service.duration_minutes} min`}
                </p>
                {service.description && (
                  <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability Calendar */}
      <section className="py-6 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-3">Book a slot</h2>
          <AvailabilityCalendar services={services} walkerId={walker.id} />
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-gray-100 py-6 md:py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold mb-3">Reviews</h2>
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="font-semibold text-sm">{review.users?.name || 'Anonymous'}</span>
                    <span className="ml-2 text-sm">
                      <StarRating rating={review.rating} />
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{review.created_at}</span>
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
