import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { resolveWalker } from '@/utils/walker'
import { clientPriceCents } from '@/utils/pricing'
import AvailabilityCalendar from '@/features/calendar/AvailabilityCalendar'
import { formatGBP } from '@/utils/formatting'
import { ChevronLeft, Clock, Moon } from 'lucide-react'

export default function ServiceBooking() {
  const { walker: walkerParam, serviceId } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const prefix = walkerParam ? `/w/${walkerParam}` : ''

  const [walker, setWalker] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    async function load() {
      const { data: wp, error: wpErr } = await supabase
        .from('walker_profiles')
        .select('id, slug, business_name, theme_color, users(name, avatar_url)')
        .eq('slug', slug)
        .single()
      if (wpErr || !wp) { setError('Walker not found'); setLoading(false); return }
      setWalker(wp)

      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('walker_id', wp.id)
        .eq('active', true)
      setServices(svcs || [])
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="h-96 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !walker) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl mb-2">Walker not found</h1>
        <p className="text-gray-500">We couldn't find this walker.</p>
      </div>
    )
  }

  const avatarUrl = walker.users?.avatar_url
  const activeServices = services.filter((s) => s.active)
  const selectedService = activeServices.find((s) => s.id === serviceId) || activeServices[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`${prefix || `/w/${slug}`}`} className="cursor-pointer p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
          <ChevronLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : walker.business_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-semibold">{walker.business_name}</h1>
            <p className="text-xs text-gray-500">Select dates and times to book</p>
          </div>
        </div>
      </div>

      {/* Service pills */}
      {activeServices.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {activeServices.map((svc) => {
            const isOvernight = svc.service_type === 'overnight'
            const isActive = svc.id === (selectedService?.id)
            return (
              <Link
                key={svc.id}
                to={`${prefix}/book/${svc.id}`}
                replace
                className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {isOvernight ? <Moon size={14} /> : <Clock size={14} />}
                {svc.name}
                <span className="text-xs font-normal text-gray-400">
                  {formatGBP(clientPriceCents(svc.price_cents), { smart: true })}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Calendar */}
      {selectedService && (
        <AvailabilityCalendar
          services={activeServices}
          walkerId={walker.id}
          initialServiceId={selectedService.id}
        />
      )}

      {activeServices.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No services available for booking.</p>
        </div>
      )}
    </div>
  )
}
