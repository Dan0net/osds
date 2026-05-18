import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useOutlet } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { format, parseISO, addDays, startOfMonth, differenceInCalendarDays } from 'date-fns'
import { useAuth } from '@/auth/useAuth'
import { bookingStatusBadge, toneColor } from '@/utils/bookingStatus'
import { useClientBookings, useWalkerBookings } from '@/queries/bookings'
import { useExternalEvents } from '@/queries/ical'
import { useServicesCount } from '@/queries/services'
import { useWalkerCustomers } from '@/queries/customers'
import { useOwnerWalkers } from '@/queries/walkers'
import BookingForm from '@/features/bookings/BookingForm'
import OwnerBookingForm from '@/features/bookings/OwnerBookingForm'
import MonthCalendar from '@/features/bookings/MonthCalendar'
import BookingsSidebar from '@/features/bookings/BookingsSidebar'
import BookingsList from '@/features/bookings/BookingsList'
import ListPaneHeader from '@/shared/ListPaneHeader'
import PaidSuccessModal from '@/features/payments/PaidSuccessModal'
import { Spinner, PageSpinner } from '@/shared/Spinner'

const EXTERNAL_COLOR = '#9ca3af'

export default function AccountBookings() {
  const { user, walkerProfile } = useAuth()
  const isWalker = !!walkerProfile
  const outlet = useOutlet()

  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentBanner, setPaymentBanner] = useState(null)
  const [createBookingModal, setCreateBookingModal] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [drawerHeight, setDrawerHeight] = useState('half')

  const clientBookingsQuery = useClientBookings(user?.id)
  const walkerBookingsQuery = useWalkerBookings(walkerProfile?.id)
  const externalEventsQuery = useExternalEvents(walkerProfile?.id)
  const servicesCountQuery = useServicesCount(walkerProfile?.id)
  const customersQuery = useWalkerCustomers(walkerProfile?.id)
  const ownerWalkersQuery = useOwnerWalkers(!isWalker ? user?.id : null)

  const loading = clientBookingsQuery.isLoading || (isWalker && (walkerBookingsQuery.isLoading || externalEventsQuery.isLoading))

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

  useEffect(() => {
    if (searchParams.get('action') === 'create' && isWalker) {
      setCreateBookingModal(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [isWalker])

  const bookings = useMemo(() => {
    const merged = []
    for (const b of clientBookingsQuery.data || []) merged.push(toEvent(b, false))
    for (const b of walkerBookingsQuery.data || []) merged.push(toEvent(b, true))
    for (const e of externalEventsQuery.data || []) merged.push(toExternalEvent(e))
    return merged
  }, [clientBookingsQuery.data, walkerBookingsQuery.data, externalEventsQuery.data])

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

  const customerCount = customersQuery.data?.length || 0
  const servicesCount = servicesCountQuery.data || 0
  const walkerBookingsCount = walkerBookingsQuery.data?.length || 0
  const ownerWalkersCount = ownerWalkersQuery.data?.length || 0

  const setupItems = isWalker ? [
    { done: customerCount > 0, label: 'Add a customer', link: '/account/customers' },
    { done: servicesCount > 0, label: 'Add a service', link: '/account/services' },
    { done: !!walkerProfile?.stripe_charges_enabled, label: 'Connect Stripe', link: '/account/settings/stripe' },
    { done: walkerBookingsCount > 0, label: 'Add a booking', onClick: () => setCreateBookingModal(true) },
  ] : null

  const banner = (
    <>
      {paymentBanner === 'cancelled' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <span>Payment was cancelled. You can try again from your bookings.</span>
          <button onClick={() => setPaymentBanner(null)} className="text-yellow-700 hover:text-yellow-900 font-bold">×</button>
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="lg:hidden">
        {outlet ? outlet : (
          <>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h1 className="text-xl truncate">{format(visibleMonth, 'MMMM yyyy')}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTodayClick}
                  className="cursor-pointer h-9 px-3 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Today
                </button>
                {(isWalker || ownerWalkersCount > 0) && (
                  <button
                    onClick={() => setCreateBookingModal(true)}
                    aria-label={isWalker ? 'Add booking' : 'Request booking'}
                    className="cursor-pointer h-9 w-9 sm:w-auto sm:px-4 inline-flex items-center justify-center sm:gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">{isWalker ? 'Add booking' : 'Request booking'}</span>
                  </button>
                )}
              </div>
            </div>

            {banner}

            {loading ? (
              <PageSpinner />
            ) : (
              <div className="h-[calc(50dvh-5.5rem)]">
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
          </>
        )}
      </div>

      <div className="hidden lg:flex lg:fixed lg:left-56 lg:right-0 lg:top-0 lg:bottom-[var(--install-prompt-h,0px)] lg:bg-white">
        <aside className="w-[var(--list-sidebar-w,14rem)] border-r border-gray-200 bg-white flex flex-col">
          <ListPaneHeader
            title="Bookings"
            right={(isWalker || ownerWalkersCount > 0) ? (
              <button
                onClick={() => setCreateBookingModal(true)}
                aria-label={isWalker ? 'Add booking' : 'Request booking'}
                className="cursor-pointer h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} />
                {isWalker ? 'Add booking' : 'Request booking'}
              </button>
            ) : null}
          />
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <BookingsList
              eventsByDay={eventsByDay}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              setupItems={setupItems}
              className="flex-1"
            />
          )}
        </aside>
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-4 py-5">
            {banner}
            {outlet || (
              <MonthCalendar
                eventsByDay={eventsByDay}
                selectedDate={selectedDate}
                onSelect={handleSelectDate}
                onToday={handleTodayClick}
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
              />
            )}
          </div>
        </section>
      </div>

      {isWalker ? (
        <BookingForm
          open={createBookingModal}
          onClose={() => setCreateBookingModal(false)}
          onCreated={() => setCreateBookingModal(false)}
        />
      ) : (
        <OwnerBookingForm
          open={createBookingModal}
          onClose={() => setCreateBookingModal(false)}
          onCreated={() => setCreateBookingModal(false)}
        />
      )}

      <PaidSuccessModal
        open={paymentBanner === 'success'}
        onClose={() => setPaymentBanner(null)}
      />
    </>
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
    durationMinutes = 1440
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
    postcode: isWalkerSide ? b.users?.postcode : null,
    external: false,
  }
}
