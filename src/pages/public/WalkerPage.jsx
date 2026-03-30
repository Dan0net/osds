import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { resolveWalker } from '../../lib/walker'
import { useAuth } from '../../hooks/useAuth'
import { clientPriceCents } from '../../lib/utils'
import { Star, Heart, MapPin, Clock, Moon, ChevronLeft, ChevronRight, Shield, Calendar, PawPrint } from 'lucide-react'

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
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

function Stars({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
      ))}
    </div>
  )
}

export default function WalkerPage() {
  const { walker: walkerParam } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [walker, setWalker] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFavourite, setIsFavourite] = useState(false)
  const [reviewPage, setReviewPage] = useState(0)

  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const reviewsPerPage = 4

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    async function load() {
      const { data: wp, error: wpErr } = await supabase
        .from('walker_profiles')
        .select('*, users(name, avatar_url)')
        .eq('slug', slug)
        .single()
      if (wpErr || !wp) { setError('Walker not found'); setLoading(false); return }
      setWalker(wp)

      const [svcRes, revRes] = await Promise.all([
        supabase.from('services').select('*').eq('walker_id', wp.id).eq('active', true),
        supabase.from('reviews').select('*, users(name)').eq('walker_id', wp.id).order('created_at', { ascending: false }),
      ])
      setServices(svcRes.data || [])
      setReviews(revRes.data || [])
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (walker && profile?.favourite_walkers) {
      setIsFavourite(profile.favourite_walkers.includes(walker.id))
    }
  }, [walker?.id, profile?.favourite_walkers])

  async function toggleFavourite() {
    if (!user || !walker) return
    const favs = profile?.favourite_walkers || []
    const newFavs = isFavourite ? favs.filter((id) => id !== walker.id) : [...favs, walker.id]
    setIsFavourite(!isFavourite)
    await supabase.from('users').update({ favourite_walkers: newFavs }).eq('id', user.id)
    refreshProfile()
  }

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="animate-pulse">
          <div className="h-80 bg-gray-200 rounded-xl mb-6" />
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !walker) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <PawPrint size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl mb-2">Walker not found</h1>
        <p className="text-gray-500">We couldn't find a walker with that name.</p>
      </div>
    )
  }

  const avatarUrl = walker.users?.avatar_url
  const coverUrl = walker.cover_url
  const hasImages = !!(avatarUrl || coverUrl)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Photo gallery — Airbnb style */}
      {hasImages && (
        <div className="rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[420px]">
            {/* Main image */}
            <div className="relative aspect-[4/3] md:aspect-auto md:row-span-2 overflow-hidden bg-gray-100">
              <img
                src={coverUrl || avatarUrl}
                alt={walker.business_name}
                className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
              />
            </div>
            {/* Secondary image */}
            {coverUrl && avatarUrl ? (
              <div className="hidden md:block relative overflow-hidden bg-gray-100">
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer"
                />
              </div>
            ) : (
              <div
                className="hidden md:flex items-center justify-center"
                style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
              >
                <span className="text-6xl font-bold text-white/30">{walker.business_name?.charAt(0)}</span>
              </div>
            )}
            {/* Accent block */}
            <div
              className="hidden md:flex items-center justify-center"
              style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
            >
              <PawPrint size={48} className="text-white/20" />
            </div>
          </div>
        </div>
      )}

      {/* No images fallback — coloured banner */}
      {!hasImages && (
        <div
          className="rounded-xl h-48 flex items-center justify-center mb-6"
          style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
        >
          <span className="text-7xl font-bold text-white/30">{walker.business_name?.charAt(0)}</span>
        </div>
      )}

      {/* Main content grid — info left, booking card right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Left column — info */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">{walker.business_name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-gray-900">{avgRating}</span>
                    <span>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                  </span>
                )}
                {walker.postcode && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {walker.postcode}
                  </span>
                )}
              </div>
            </div>
            {user && (
              <button
                onClick={toggleFavourite}
                className="cursor-pointer p-2 rounded-full hover:bg-gray-100 transition"
                title={isFavourite ? 'Remove from favourites' : 'Save'}
              >
                <Heart size={22} className={isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
              </button>
            )}
          </div>

          {/* Hosted by */}
          <div className="flex items-center gap-3 py-4 border-t border-b border-gray-200">
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : walker.users?.name?.charAt(0) || walker.business_name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">Hosted by {walker.users?.name || walker.business_name}</p>
              <p className="text-xs text-gray-500">Member since {new Date(walker.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {/* About */}
          {walker.bio && (
            <div className="py-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold mb-3">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{walker.bio}</p>
            </div>
          )}

          {/* Highlights */}
          <div className="py-6 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Shield size={24} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Verified walker</p>
                  <p className="text-xs text-gray-500">Identity confirmed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={24} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Online booking</p>
                  <p className="text-xs text-gray-500">Real-time availability</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PawPrint size={24} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Book directly</p>
                  <p className="text-xs text-gray-500">No middleman fees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Services</h2>
            <div className="space-y-3">
              {services.filter((s) => s.active).map((service) => {
                const isOvernight = service.service_type === 'overnight'
                return (
                  <button
                    key={service.id}
                    onClick={() => navigate(`${prefix}/book/${service.id}`)}
                    className="cursor-pointer w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        {isOvernight ? <Moon size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium group-hover:text-indigo-600 transition">{service.name}</h3>
                        <p className="text-xs text-gray-500">
                          {isOvernight ? 'per night' : `${service.duration_minutes} min`}
                          {service.description && ` · ${service.description}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                      £{(clientPriceCents(service.price_cents) / 100).toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} className="fill-yellow-400 text-yellow-400" />
                <h2 className="text-lg font-semibold">{avgRating} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.slice(reviewPage * reviewsPerPage, (reviewPage + 1) * reviewsPerPage).map((review) => (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {review.users?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.users?.name || 'Anonymous'}</p>
                          <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
                        </div>
                      </div>
                      <Stars rating={review.rating} size={12} />
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>

              {reviews.length > reviewsPerPage && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setReviewPage((p) => Math.max(0, p - 1))}
                    disabled={reviewPage === 0}
                    className="cursor-pointer p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-500">
                    {reviewPage + 1} of {Math.ceil(reviews.length / reviewsPerPage)}
                  </span>
                  <button
                    onClick={() => setReviewPage((p) => Math.min(Math.ceil(reviews.length / reviewsPerPage) - 1, p + 1))}
                    disabled={(reviewPage + 1) * reviewsPerPage >= reviews.length}
                    className="cursor-pointer p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — sticky booking card */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white border border-gray-200 rounded-xl shadow-lg p-6">
            <div className="flex items-baseline justify-between mb-4">
              {services.length > 0 && (
                <p className="text-lg">
                  <span className="font-semibold">From £{(clientPriceCents(Math.min(...services.map((s) => s.price_cents))) / 100).toFixed(0)}</span>
                  <span className="text-gray-500 text-sm"> / visit</span>
                </p>
              )}
              {avgRating && (
                <span className="flex items-center gap-1 text-sm">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{avgRating}</span>
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {services.filter((s) => s.active).slice(0, 4).map((service) => (
                <Link
                  key={service.id}
                  to={`${prefix}/book/${service.id}`}
                  className="cursor-pointer flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition text-sm"
                >
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <span className="text-gray-400 ml-1.5">
                      {service.service_type === 'overnight' ? '/ night' : `/ ${service.duration_minutes}min`}
                    </span>
                  </div>
                  <span className="font-semibold text-indigo-600">£{(clientPriceCents(service.price_cents) / 100).toFixed(0)}</span>
                </Link>
              ))}
            </div>

            {services.length > 0 && (
              <Link
                to={`${prefix}/book/${services[0].id}`}
                className="cursor-pointer block text-center bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition"
              >
                Book now
              </Link>
            )}

            {services.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No services available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
