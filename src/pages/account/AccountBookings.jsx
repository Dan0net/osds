import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { format, parseISO, addDays, startOfMonth, differenceInCalendarDays } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { bookingStatusBadge, toneColor } from '../../lib/bookingStatus'
import { loadWalkerCustomers } from '../../lib/customers'
import BookingForm from '../../components/account/BookingForm'
import MonthCalendar from '../../components/account/MonthCalendar'
import BookingsSidebar from '../../components/account/BookingsSidebar'

const EXTERNAL_COLOR = '#9ca3af' // gray-400

export default function AccountBookings() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [servicesCount, setServicesCount] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [walkerBookingsCount, setWalkerBookingsCount] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentBanner, setPaymentBanner] = useState(null)
  const [createBookingModal, setCreateBookingModal] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [drawerHeight, setDrawerHeight] = useState('half')

  // Payment success/cancel banner from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      setPaymentBanner('success')
      searchParams.delete('payment')
      searchParams.delete('session_id')
      setSearchParams(searchParams, { replace: true })
    } else if (paymentStatus === 'cancelled') {
      setPaymentBanner('cancelled')
      searchParams.delete('payment')
      setSearchParams(searchParams, { replace: true })
    }
  }, [])

  // ?action=create deep link
  useEffect(() => {
    if (searchParams.get('action') === 'create' && isWalker) {
      setCreateBookingModal(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [isWalker])

  useEffect(() => {
    if (user) loadBookings()
  }, [user?.id, walkerProfile?.id])

  async function loadBookings() {
    setLoading(true)

    const clientPromise = supabase
      .from('bookings')
      .select('*, services(name), pets(name), walker_profiles(slug, business_name, theme_color), payments(status, source)')
      .eq('client_id', user.id)
      .order('booking_date', { ascending: true })

    const walkerPromise = walkerProfile
      ? supabase
          .from('bookings')
          .select('*, services(name), pets(name), payments(source), users!bookings_client_id_fkey(name)')
          .eq('walker_id', walkerProfile.id)
          .order('booking_date', { ascending: true })
      : Promise.resolve({ data: [] })

    const externalPromise = walkerProfile
      ? apiFetch('get-external-events')
      : Promise.resolve({ data: { events: [] } })

    const servicesCountPromise = walkerProfile
      ? supabase.from('services').select('id', { count: 'exact', head: true }).eq('walker_id', walkerProfile.id)
      : Promise.resolve({ count: 0 })

    const customersPromise = walkerProfile
      ? loadWalkerCustomers(walkerProfile.id)
      : Promise.resolve([])

    const [clientRes, walkerRes, externalRes, servicesRes, customers] = await Promise.all([
      clientPromise, walkerPromise, externalPromise, servicesCountPromise, customersPromise,
    ])

    const merged = []
    for (const b of clientRes.data || []) merged.push(toEvent(b, false))
    for (const b of walkerRes.data || []) merged.push(toEvent(b, true))
    for (const e of externalRes.data?.events || []) merged.push(toExternalEvent(e))

    setBookings(merged)
    setServicesCount(servicesRes.count || 0)
    setCustomerCount(customers.length)
    setWalkerBookingsCount((walkerRes.data || []).length)
    setLoading(false)
  }

  // Build eventsByDay map, expanding overnight bookings to span their date range
  const eventsByDay = useMemo(() => {
    const map = {}
    for (const event of bookings) {
      const start = parseISO(event.booking_date)
      const end = event.end_date ? parseISO(event.end_date) : start
      let cursor = start
      while (cursor <= end) {
        const key = format(cursor, 'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        map[key].push(event)
        cursor = addDays(cursor, 1)
      }
    }
    // Sort events within each day: bookings first (by time), external events last
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (a.external !== b.external) return a.external ? 1 : -1
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
    }
    return map
  }, [bookings])

  const handleSelectDate = useCallback((day) => {
    setSelectedDate(day)
    setVisibleMonth(startOfMonth(day))
  }, [])

  function handleTodayClick() {
    handleSelectDate(new Date())
  }

  const setupItems = isWalker ? [
    { done: customerCount > 0, label: 'Add a customer', link: '/account/customers' },
    { done: servicesCount > 0, label: 'Add a service', link: '/account/services' },
    { done: !!walkerProfile?.stripe_charges_enabled, label: 'Connect Stripe', link: '/account/settings/stripe' },
    { done: walkerBookingsCount > 0, label: 'Add a booking', onClick: () => setCreateBookingModal(true) },
  ] : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3 lg:mb-6 gap-2">
        <h1 className="text-xl lg:text-2xl truncate">
          <span className="lg:hidden">{format(visibleMonth, 'MMMM yyyy')}</span>
          <span className="hidden lg:inline">Bookings</span>
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTodayClick}
            className="lg:hidden cursor-pointer h-9 px-3 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Today
          </button>
          {isWalker && (
            <button
              onClick={() => setCreateBookingModal(true)}
              aria-label="Add booking"
              className="cursor-pointer h-9 w-9 sm:w-auto sm:px-4 inline-flex items-center justify-center sm:gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add booking</span>
            </button>
          )}
        </div>
      </div>

      {paymentBanner === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <span>Payment successful! Your booking is now confirmed.</span>
          <button onClick={() => setPaymentBanner(null)} className="text-green-700 hover:text-green-900 font-bold">×</button>
        </div>
      )}
      {paymentBanner === 'cancelled' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <span>Payment was cancelled. You can try again from your bookings.</span>
          <button onClick={() => setPaymentBanner(null)} className="text-yellow-700 hover:text-yellow-900 font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-[calc(50dvh-5.5rem)] lg:h-[calc(100vh-10rem)] lg:pr-[21.5rem]">
          <MonthCalendar
            eventsByDay={eventsByDay}
            selectedDate={selectedDate}
            onSelect={handleSelectDate}
            onToday={handleTodayClick}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
          />
          <BookingsSidebar
            eventsByDay={eventsByDay}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            setupItems={setupItems}
            drawerHeight={drawerHeight}
            onToggleDrawerHeight={() => setDrawerHeight((h) => (h === 'half' ? 'full' : 'half'))}
          />
        </div>
      )}

      <BookingForm
        open={createBookingModal}
        onClose={() => setCreateBookingModal(false)}
        onCreated={() => { setCreateBookingModal(false); loadBookings() }}
      />
    </div>
  )
}

function minutesBetween(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh - sh) * 60 + (em - sm)
}

function formatDuration(start, end) {
  const mins = minutesBetween(start, end)
  if (mins <= 0) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function toExternalEvent(e) {
  const startLabel = e.allDay ? 'All day' : (e.start_time?.slice(0, 5) || '')
  const durationLabel = !e.allDay && e.end_time && e.start_time
    ? formatDuration(e.start_time, e.end_time)
    : ''
  const durationMinutes = e.allDay
    ? 1440
    : Math.max(15, minutesBetween(e.start_time, e.end_time) || 30)
  return {
    id: e.id || `ext-${e.date}-${e.start_time || 'allday'}`,
    booking_date: e.date,
    end_date: null,
    start_time: e.start_time,
    color: EXTERNAL_COLOR,
    primaryLabel: e.title || 'Busy',
    secondaryLabel: '',
    startLabel,
    durationLabel,
    durationMinutes,
    external: true,
  }
}

const INACTIVE_STATUSES = new Set(['cancelled', 'declined', 'refunded'])

function toEvent(b, isWalkerSide) {
  const color = toneColor(bookingStatusBadge(b).tone)
  const service = b.services?.name || 'Booking'
  const counterpartyName = isWalkerSide
    ? (b.users?.name || 'Customer')
    : (b.walker_profiles?.business_name || 'Walker')
  const petName = b.pets?.name
  const primaryLabel = petName ? `${counterpartyName} · ${petName}` : counterpartyName
  const startTime = b.start_time?.slice(0, 5) || ''
  const isOvernight = !!b.end_date && b.end_date !== b.booking_date
  const startLabel = startTime
  let durationLabel = ''
  let durationMinutes = 30
  if (isOvernight) {
    const nights = differenceInCalendarDays(parseISO(b.end_date), parseISO(b.booking_date))
    durationLabel = `${nights}n stay`
    durationMinutes = 1440 // each calendar day the overnight touches reads as a full day
  } else if (b.end_time) {
    durationLabel = formatDuration(b.start_time, b.end_time)
    durationMinutes = Math.max(15, minutesBetween(b.start_time, b.end_time) || 30)
  }
  return {
    id: b.id,
    booking_date: b.booking_date,
    end_date: b.end_date,
    start_time: b.start_time,
    color,
    primaryLabel,
    secondaryLabel: service,
    startLabel,
    durationLabel,
    durationMinutes,
    inactive: INACTIVE_STATUSES.has(b.status),
    external: false,
  }
}
