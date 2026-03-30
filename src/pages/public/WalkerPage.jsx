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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

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
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [reviewOffset, setReviewOffset] = useState(0)

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

      const activeSvcs = (svcRes.data || []).filter((s) => s.active)
      setServices(svcRes.data || [])
      setReviews(revRes.data || [])
      if (activeSvcs.length > 0) setSelectedServiceId(activeSvcs[0].id)
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
        <h1 className="text-2xl mb-2">Walker not found</h1>
        <p className="text-gray-500">We couldn't find a walker with that name.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero with cover image */}
      <section className="relative text-white overflow-hidden">
        {/* Cover */}
        {walker.cover_url ? (
          <div className="absolute inset-0">
            <img src={walker.cover_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: walker.theme_color || '#4f46e5' }} />
        )}

        <div className="relative max-w-3xl mx-auto text-center py-12 md:py-20 px-4">
          {user && (
            <button
              onClick={toggleFavourite}
              className="absolute top-4 right-4 text-2xl hover:scale-110 transition"
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              {isFavourite ? '❤️' : '🤍'}
            </button>
          )}
          <div className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-white/30 overflow-hidden flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: walker.theme_color || '#818cf8' }}>
            {walker.users?.avatar_url ? (
              <img src={walker.users.avatar_url} alt={walker.business_name} className="w-full h-full object-cover" />
            ) : (
              walker.business_name.charAt(0)
            )}
          </div>
          <h1 className="text-3xl md:text-4xl mb-1">{walker.business_name}</h1>
          {avgRating && (
            <div className="flex items-center justify-center gap-1.5 text-sm mb-1">
              <span className="text-yellow-300">{'★'.repeat(Math.round(avgRating))}</span>
              <span className="text-white/70">{avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
          <p className="text-sm text-white/80 max-w-md mx-auto">{walker.bio}</p>
        </div>
      </section>

      {/* Services — selectable cards */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl mb-4">Select a service</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {services.filter((s) => s.active).map((service) => {
              const isSelected = selectedServiceId === service.id
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedServiceId(isSelected ? null : service.id)}
                  className={`border rounded-lg p-3 bg-white text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-200'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm">{service.name}</h3>
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
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Availability Calendar — shown only when a service is selected */}
      {selectedServiceId && (
        <section className="py-8 md:py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl mb-4">Book a slot</h2>
            <AvailabilityCalendar services={services} walkerId={walker.id} initialServiceId={selectedServiceId} />
          </div>
        </section>
      )}

      {/* Reviews — 3 column carousel */}
      {reviews.length > 0 && (
      <section className="bg-gray-100 py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Reviews</h2>
            {reviews.length > 3 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setReviewOffset((o) => Math.max(0, o - 3))}
                  disabled={reviewOffset === 0}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-500 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => setReviewOffset((o) => Math.min(reviews.length - 1, o + 3))}
                  disabled={reviewOffset + 3 >= reviews.length}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-500 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reviews.slice(reviewOffset, reviewOffset + 3).map((review) => (
              <div key={review.id} className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{review.users?.name || 'Anonymous'}</span>
                  <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
                </div>
                <div className="text-yellow-400 text-sm mb-2">
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}
    </div>
  )
}
