import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { colorForBooking } from '../../lib/eventColor'
import Modal from '../../components/Modal'
import BookingForm from '../../components/account/BookingForm'
import MonthCalendar from '../../components/account/MonthCalendar'
import DayDetail from '../../components/account/DayDetail'
import UpcomingList from '../../components/account/UpcomingList'
import ViewToggle from '../../components/account/ViewToggle'

const EXTERNAL_COLOR = '#9ca3af' // gray-400

const VIEW_STORAGE_KEY = 'osds_bookings_view'

function readStoredView() {
  if (typeof window === 'undefined') return 'calendar'
  const v = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return v === 'list' ? 'list' : 'calendar'
}

export default function AccountBookings() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentBanner, setPaymentBanner] = useState(null)
  const [createBookingModal, setCreateBookingModal] = useState(false)
  const [view, setView] = useState(readStoredView)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  // Mobile drawer is open by default showing today's events; on desktop the
  // sidebar is always visible and this flag is ignored.
  const [sheetOpen, setSheetOpen] = useState(true)

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

  // Persist view choice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view)
    }
  }, [view])

  async function loadBookings() {
    setLoading(true)

    const clientPromise = supabase
      .from('bookings')
      .select('*, services(name), pets(name), walker_profiles(slug, business_name, theme_color), payments(status)')
      .eq('client_id', user.id)
      .order('booking_date', { ascending: true })

    const walkerPromise = walkerProfile
      ? supabase
          .from('bookings')
          .select('*, services(name), pets(name), users!bookings_client_id_fkey(name)')
          .eq('walker_id', walkerProfile.id)
          .order('booking_date', { ascending: true })
      : Promise.resolve({ data: [] })

    const externalPromise = walkerProfile
      ? apiFetch('get-external-events')
      : Promise.resolve({ data: { events: [] } })

    const [clientRes, walkerRes, externalRes] = await Promise.all([clientPromise, walkerPromise, externalPromise])

    const merged = []
    for (const b of clientRes.data || []) merged.push(toEvent(b, false))
    for (const b of walkerRes.data || []) merged.push(toEvent(b, true))
    for (const e of externalRes.data?.events || []) merged.push(toExternalEvent(e))

    setBookings(merged)
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

  function handleDaySelect(day) {
    setSelectedDate(day)
    setSheetOpen(true)
  }

  function handleTodayClick() {
    const today = new Date()
    setVisibleMonth(today)
    setSelectedDate(today)
    setSheetOpen(true)
  }

  const walkerReady = !!(walkerProfile?.business_name && walkerProfile?.postcode && walkerProfile?.stripe_account_id)
  const noBookingsYet = bookings.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3 lg:mb-6 gap-2">
        <h1 className="text-xl lg:text-2xl truncate">
          {view === 'calendar' ? (
            <>
              <span className="lg:hidden">{format(visibleMonth, 'MMMM yyyy')}</span>
              <span className="hidden lg:inline">Bookings</span>
            </>
          ) : (
            'Bookings'
          )}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {view === 'calendar' && (
            <button
              onClick={handleTodayClick}
              className="lg:hidden cursor-pointer h-9 px-3 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Today
            </button>
          )}
          <ViewToggle value={view} onChange={setView} />
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
      ) : view === 'calendar' ? (
        <div className="lg:flex lg:gap-6">
          <MonthCalendar
            eventsByDay={eventsByDay}
            selectedDate={selectedDate}
            onSelect={handleDaySelect}
            onToday={handleTodayClick}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
          />
          <DayDetail
            date={selectedDate}
            events={selectedDate ? (eventsByDay[format(selectedDate, 'yyyy-MM-dd')] || []) : []}
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
          />
        </div>
      ) : (
        <UpcomingList eventsByDay={eventsByDay} />
      )}

      {isWalker && walkerReady && noBookingsYet && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-2">Your page is live!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Share your page with clients or add a booking to get started.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/w/${walkerProfile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700"
            >
              View your live page
            </a>
            <button
              onClick={() => setCreateBookingModal(true)}
              className="cursor-pointer border border-indigo-600 text-indigo-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-50"
            >
              Add booking for a client
            </button>
          </div>
        </div>
      )}

      {isWalker && !walkerReady && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
          <h2 className="mb-3 font-semibold">Get your page live</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { done: !!walkerProfile.business_name, label: 'Set up your profile', link: '/account/profile' },
              { done: false, label: 'Add your services', link: '/account/services' },
              { done: !!walkerProfile.postcode, label: 'Add your postcode', link: '/account/profile' },
              { done: !!walkerProfile.stripe_account_id, label: 'Connect Stripe', link: '/account/settings/stripe' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className={`flex items-center gap-2 p-3 rounded-lg border transition ${
                  item.done
                    ? 'bg-green-50 border-green-200 hover:bg-green-100'
                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  item.done ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {item.done ? '✓' : '·'}
                </span>
                <span className={`text-sm font-medium ${item.done ? 'text-gray-400' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Modal open={createBookingModal} onClose={() => setCreateBookingModal(false)} title="New booking">
        <BookingForm onCreated={() => { setCreateBookingModal(false); loadBookings() }} onCancel={() => setCreateBookingModal(false)} />
      </Modal>
    </div>
  )
}

function toExternalEvent(e) {
  return {
    id: e.id || `ext-${e.date}-${e.start_time || 'allday'}`,
    booking_date: e.date,
    end_date: null,
    start_time: e.start_time,
    end_time: e.end_time,
    status: null,
    color: EXTERNAL_COLOR,
    title: e.title || 'Busy',
    subtitle: 'External calendar',
    timeLabel: e.allDay ? 'All day' : (e.end_time ? `${e.start_time?.slice(0, 5) || ''} – ${e.end_time.slice(0, 5)}` : e.start_time?.slice(0, 5) || ''),
    external: true,
  }
}

function toEvent(b, isWalkerSide) {
  const color = colorForBooking(b, { isWalker: isWalkerSide })
  const title = b.services?.name || 'Booking'
  const counterpartyName = isWalkerSide
    ? (b.users?.name || 'Customer')
    : (b.walker_profiles?.business_name || 'Walker')
  const petName = b.pets?.name
  const subtitle = petName ? `${counterpartyName} · ${petName}` : counterpartyName
  const startTime = b.start_time?.slice(0, 5) || ''
  const endTime = b.end_time?.slice(0, 5) || ''
  const isOvernight = !!b.end_date && b.end_date !== b.booking_date
  let timeLabel = startTime
  if (isOvernight) timeLabel = `${startTime || ''} → ${b.end_date}`
  else if (endTime) timeLabel = `${startTime} – ${endTime}`
  return {
    id: b.id,
    booking_date: b.booking_date,
    end_date: b.end_date,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    color,
    title,
    subtitle,
    timeLabel,
    external: false,
  }
}
