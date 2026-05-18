import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Clock, Moon, MessageCircle, PawPrint, MapPin } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useWalker, useOwnerBookingsForWalker } from '@/queries/walkers'
import { useServices } from '@/queries/services'
import { useEnsureConversation } from '@/queries/messages'
import { clientPriceCents } from '@/utils/pricing'
import { bookingStatusBadge, toneClass } from '@/utils/bookingStatus'
import DetailHeader from '@/shared/detail/DetailHeader'
import LinkRow from '@/shared/detail/LinkRow'
import OwnerBookingForm from '@/features/bookings/OwnerBookingForm'
import { Spinner } from '@/shared/Spinner'

export default function WalkerDetail() {
  const { walkerId } = useParams()
  const { user, walkerProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/walkers'
  const backLabel = from?.startsWith('/account/bookings/') ? 'Booking' : 'Walkers'

  const walkerQuery = useWalker(walkerId)
  const servicesQuery = useServices(walkerId, { activeOnly: true })
  const bookingsQuery = useOwnerBookingsForWalker(walkerId, user?.id)
  const ensureConversation = useEnsureConversation()

  const walker = walkerQuery.data
  const services = servicesQuery.data || []
  const bookings = bookingsQuery.data || []
  const loading = walkerQuery.isLoading

  const [bookingOpen, setBookingOpen] = useState(false)
  const [preselectedServiceId, setPreselectedServiceId] = useState(null)

  function openServiceBooking(serviceId) {
    setPreselectedServiceId(serviceId)
    setBookingOpen(true)
  }

  function handleBookingCreated() {
    setBookingOpen(false)
    setPreselectedServiceId(null)
  }

  async function openConversation() {
    const id = await ensureConversation.mutateAsync({ walkerId: walker.id, clientId: user.id })
    if (id) navigate(`/account/messages/${id}`)
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  if (!walker) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-sm text-gray-500">Walker not found.</p>
      </>
    )
  }

  if (walkerProfile) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-sm text-gray-500">Walkers list is for owner accounts.</p>
      </>
    )
  }

  const avatarUrl = walker.users?.avatar_url
  const themeColor = walker.theme_color || '#4f46e5'

  return (
    <>
      <DetailHeader backHref={backHref} backLabel={backLabel} />

      <div className="rounded-xl overflow-hidden mb-5">
        {walker.cover_url ? (
          <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
            <img src={walker.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center" style={{ backgroundColor: themeColor }}>
            <PawPrint size={40} className="text-white/30" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            walker.business_name?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl truncate">{walker.business_name}</h1>
          {walker.postcode && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {walker.postcode}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <LinkRow
          icon={MessageCircle}
          value="Message"
          secondary={walker.users?.name ? `Chat with ${walker.users.name.split(' ')[0]}` : null}
          onClick={openConversation}
        />
      </div>

      {walker.bio && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">About</h2>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{walker.bio}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Services</h2>
        {services.length === 0 ? (
          <p className="text-sm text-gray-400">No services available.</p>
        ) : (
          <div className="space-y-2">
            {services.map((service) => {
              const isOvernight = service.service_type === 'overnight'
              return (
                <button
                  key={service.id}
                  onClick={() => openServiceBooking(service.id)}
                  className="cursor-pointer w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/40 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      {isOvernight ? <Moon size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{service.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {isOvernight ? 'per night' : `${service.duration_minutes} min`}
                        {service.description && ` · ${service.description}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-3">
                    £{(clientPriceCents(service.price_cents) / 100).toFixed(2)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Booking history</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y">
            {bookings.map((b) => {
              const badge = bookingStatusBadge(b)
              return (
                <Link
                  key={b.id}
                  to={`/account/bookings/${b.id}`}
                  state={{ from: `/account/walkers/${walkerId}` }}
                  className="flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.services?.name || 'Service'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${toneClass(badge.tone)}`}>
                    {badge.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <OwnerBookingForm
        open={bookingOpen}
        onClose={() => { setBookingOpen(false); setPreselectedServiceId(null) }}
        onCreated={handleBookingCreated}
        initialWalker={walker}
        initialServiceId={preselectedServiceId}
      />
    </>
  )
}
