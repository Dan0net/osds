import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch, createCheckout } from '../../lib/api'

export default function AccountDashboard() {
  const { user, profile, walkerProfile: wp } = useAuth()
  const walkerSlug = wp?.slug
  const domain = import.meta.env.VITE_DOMAIN || 'onestopdog.shop'

  const [clientBookings, setClientBookings] = useState([])
  const [walkerBookings, setWalkerBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [favouriteWalkers, setFavouriteWalkers] = useState([])
  const [bookingIntent, setBookingIntent] = useState(null)

  const [walkerPaymentsTotal, setWalkerPaymentsTotal] = useState(0)
  const [awaitingPayments, setAwaitingPayments] = useState([])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: cb } = await supabase
        .from('bookings')
        .select('*, services(*), pets(*), walker_profiles(slug, business_name), payments(status)')
        .eq('client_id', user.id)
        .order('booking_date', { ascending: false })
      setClientBookings(cb || [])

      // Load awaiting payment items for client
      const { data: awp } = await supabase
        .from('payments')
        .select('*, walker_profiles(business_name)')
        .eq('client_id', user.id)
        .eq('status', 'awaiting_payment')
        .order('created_at', { ascending: false })
      setAwaitingPayments(awp || [])

      // Load favourite walkers
      if (profile?.favourite_walkers?.length > 0) {
        const { data: favs } = await supabase
          .from('walker_profiles')
          .select('id, slug, business_name, theme_color')
          .in('id', profile.favourite_walkers)
        setFavouriteWalkers(favs || [])
      }

      // Check for unfinished booking intent
      const savedIntent = localStorage.getItem('osds_bookingIntent')
      if (savedIntent) {
        try {
          const intent = JSON.parse(savedIntent)
          if (intent.savedAt && Date.now() - intent.savedAt < 30 * 60 * 1000) {
            setBookingIntent(intent)
          } else {
            localStorage.removeItem('osds_bookingIntent')
          }
        } catch { localStorage.removeItem('osds_bookingIntent') }
      }

      if (wp) {
        const { data: wb } = await supabase
          .from('bookings')
          .select('*, services(*), pets(*), users!bookings_client_id_fkey(name)')
          .eq('walker_id', wp.id)
          .order('booking_date', { ascending: false })
        setWalkerBookings(wb || [])

        // Get real payment totals
        const { data: payments } = await supabase
          .from('payments')
          .select('total_cents, platform_fee_cents, status')
          .eq('walker_id', wp.id)
          .eq('status', 'paid')
        const total = (payments || []).reduce((sum, p) => sum + p.total_cents - (p.platform_fee_cents || 0), 0)
        setWalkerPaymentsTotal(total)
      }
      setLoading(false)
    }
    load()
  }, [user?.id, wp?.id])

  const todayLocal = new Date()
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`
  const in7 = new Date(todayLocal)
  in7.setDate(in7.getDate() + 7)
  const in7Days = `${in7.getFullYear()}-${String(in7.getMonth() + 1).padStart(2, '0')}-${String(in7.getDate()).padStart(2, '0')}`

  const activeStatuses = ['confirmed', 'requested', 'approved', 'hold', 'pending']

  const upcomingAsClient = clientBookings.filter(
    (b) =>
      activeStatuses.includes(b.status) &&
      b.booking_date >= today &&
      b.booking_date <= in7Days,
  )
  const upcomingAsWalker = walkerBookings.filter(
    (b) =>
      activeStatuses.includes(b.status) &&
      b.booking_date >= today &&
      b.booking_date <= in7Days,
  )
  const pendingRequests = walkerBookings.filter((b) => b.status === 'requested')

  useEffect(() => {
    setSelectedIds(new Set(pendingRequests.map((b) => b.id)))
  }, [walkerBookings])
  const totalRevenueCents = walkerPaymentsTotal

  function getServiceName(b) {
    return b.services?.name || 'Service'
  }
  function getWalkerName(b) {
    return b.walker_profiles?.business_name || ''
  }
  function getClientName(b) {
    return b.users?.name || ''
  }
  function getPetName(b) {
    return b.pets?.name || ''
  }

  function groupByPayment(bookings) {
    const groups = new Map()
    const singles = []
    for (const b of bookings) {
      if (b.payment_id) {
        if (!groups.has(b.payment_id)) groups.set(b.payment_id, [])
        groups.get(b.payment_id).push(b)
      } else {
        singles.push([b])
      }
    }
    return [...groups.values(), ...singles]
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllInGroup(group) {
    const requestedIds = group.filter((b) => b.status === 'requested').map((b) => b.id)
    const allSelected = requestedIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of requestedIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function handleApproveSelected(ids) {
    const key = ids.join(',')
    setActionLoading(key)
    for (const id of ids) {
      await apiFetch('approve-booking', {
        method: 'POST',
        body: JSON.stringify({ booking_id: id }),
      })
    }
    setActionLoading(null)
    setSelectedIds(new Set())
    // Refresh
    const { data: wb } = await supabase
      .from('bookings')
      .select('*, services(*), pets(*), users!bookings_client_id_fkey(name)')
      .eq('walker_id', wp.id)
      .order('booking_date', { ascending: false })
    setWalkerBookings(wb || [])
  }

  async function handlePayNow(paymentId) {
    setActionLoading(`pay-${paymentId}`)
    const res = await createCheckout(paymentId)
    if (res.data?.url) {
      window.location.href = res.data.url
    } else {
      setActionLoading(null)
    }
  }

  async function handleDeclineSelected(ids) {
    const key = ids.join(',')
    setActionLoading(key)
    for (const id of ids) {
      await apiFetch('decline-booking', {
        method: 'POST',
        body: JSON.stringify({ booking_id: id }),
      })
    }
    setActionLoading(null)
    setSelectedIds(new Set())
    const { data: wb } = await supabase
      .from('bookings')
      .select('*, services(*), pets(*), users!bookings_client_id_fkey(name)')
      .eq('walker_id', wp.id)
      .order('booking_date', { ascending: false })
    setWalkerBookings(wb || [])
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500">Upcoming</p>
          <p className="text-xl font-bold mt-0.5">{upcomingAsClient.length + upcomingAsWalker.length}</p>
        </div>
        {wp && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold mt-0.5">{pendingRequests.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold mt-0.5">{walkerBookings.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-xl font-bold mt-0.5">£{(totalRevenueCents / 100).toFixed(0)}</p>
            </div>
            {walkerSlug && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-0">
                <p className="text-xs text-gray-500">Walker page</p>
                <a href={`/w/${walkerSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline mt-0.5 inline-block break-all">
                  {walkerSlug}.{domain}
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resume booking banner */}
      {bookingIntent && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-medium text-indigo-900">You have an unfinished booking</p>
            <p className="text-indigo-700 text-xs mt-0.5">
              {bookingIntent.slots?.length || 0} slot{bookingIntent.slots?.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={bookingIntent.walkerSlug ? `/w/${bookingIntent.walkerSlug}/book` : '/'}
              className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              Resume
            </Link>
            <button
              onClick={() => { localStorage.removeItem('osds_bookingIntent'); setBookingIntent(null) }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Favourite walkers */}
      {favouriteWalkers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your walkers</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {favouriteWalkers.map((w) => (
              <Link
                key={w.id}
                to={`/w/${w.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2.5 shrink-0 hover:shadow-sm transition"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: w.theme_color || '#4f46e5' }}
                >
                  {w.business_name?.charAt(0)}
                </div>
                <span className="text-sm font-medium">{w.business_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new clients with no bookings */}
      {!wp && clientBookings.length === 0 && awaitingPayments.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center mb-8">
          <p className="text-gray-600 mb-3">Welcome! Find a local dog walker to get started.</p>
          <Link to="/" className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm inline-block">
            Find a walker
          </Link>
        </div>
      )}

      {/* Incoming requests — above upcoming */}
      {wp && pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Incoming requests</h2>
            <Link to="/account/bookings" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {groupByPayment(pendingRequests).map((group) => {
              const key = group[0].payment_id || group[0].id
              const selectedInGroup = group.filter((b) => selectedIds.has(b.id))
              const allGroupSelected = group.every((b) => selectedIds.has(b.id))

              return (
                <div key={key} className="bg-white border border-gray-200 rounded-lg p-3">
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-2">
                    {group.length > 1 && (
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        onChange={() => toggleAllInGroup(group)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    <span className="font-medium text-sm">{getClientName(group[0])}</span>
                    {group.length > 1 && (
                      <span className="text-gray-400 text-xs">({group.length} slots)</span>
                    )}
                  </div>

                  {/* Slots with checkboxes */}
                  <div className="space-y-1 mb-2">
                    {group.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => toggleSelected(b.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-600">{getServiceName(b)}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">
                          {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {b.start_time && ` ${b.start_time.slice(0, 5)}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {selectedInGroup.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproveSelected(selectedInGroup.map((b) => b.id))}
                        disabled={!!actionLoading}
                        className="bg-green-600 text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : selectedInGroup.length === group.length && group.length > 1
                          ? `Approve all (${selectedInGroup.length})`
                          : selectedInGroup.length > 1
                          ? `Approve ${selectedInGroup.length}`
                          : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDeclineSelected(selectedInGroup.map((b) => b.id))}
                        disabled={!!actionLoading}
                        className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : selectedInGroup.length === group.length && group.length > 1
                          ? `Decline all (${selectedInGroup.length})`
                          : selectedInGroup.length > 1
                          ? `Decline ${selectedInGroup.length}`
                          : 'Decline'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Awaiting payment */}
      {awaitingPayments.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Awaiting payment</h2>
            <Link to="/account/payments" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {awaitingPayments.map((p) => (
              <div key={p.id} className="bg-white border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{p.walker_profiles?.business_name || 'Walker'}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">£{(p.total_cents / 100).toFixed(2)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <button
                  onClick={() => handlePayNow(p.id)}
                  disabled={!!actionLoading}
                  className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading === `pay-${p.id}` ? 'Redirecting…' : 'Pay now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming bookings */}
      {(upcomingAsClient.length > 0 || upcomingAsWalker.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Upcoming bookings</h2>
            <Link to="/account/bookings" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingAsWalker.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{getServiceName(b)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{getClientName(b)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">
                    {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {b.start_time && ` ${b.start_time.slice(0, 5)}`}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700'
                    : b.status === 'approved' ? 'bg-blue-100 text-blue-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
            {upcomingAsClient.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{getServiceName(b)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{getWalkerName(b)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">
                    {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {b.start_time && ` ${b.start_time.slice(0, 5)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {b.status === 'approved' && b.payment_id && b.payments?.status === 'awaiting_payment' && (
                    <button
                      onClick={() => handlePayNow(b.payment_id)}
                      disabled={!!actionLoading}
                      className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {actionLoading === `pay-${b.payment_id}` ? 'Redirecting…' : 'Pay now'}
                    </button>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700'
                      : b.status === 'approved' ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Walker setup checklist */}
      {wp && walkerBookings.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold mb-3">Get your page live</h2>
          <div className="space-y-2 text-sm">
            {[
              { done: !!wp.business_name, label: 'Set up your profile', link: '/account/profile' },
              { done: false, label: 'Add your services', link: '/account/settings' },
              { done: !!wp.postcode, label: 'Add your postcode', link: '/account/profile' },
              { done: !!wp.stripe_account_id, label: 'Connect Stripe', link: '/account/profile' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className="flex items-center gap-2 hover:bg-gray-50 rounded p-1.5 -mx-1.5"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  item.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {item.done ? '✓' : '·'}
                </span>
                <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          {[...walkerBookings, ...clientBookings]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((b) => {
              const isIncoming = b.walker_id === wp?.id
              const svcName = getServiceName(b)
              const personName = isIncoming ? getClientName(b) : getWalkerName(b)
              const petName = getPetName(b)
              const icons = { requested: '📩', approved: '✅', confirmed: '💳', declined: '❌', cancelled: '🚫' }
              const icon = icons[b.status] || '📋'
              const labels = {
                requested: isIncoming ? `${personName} requested ${svcName}` : `You requested ${svcName} with ${personName}`,
                approved: isIncoming ? `You approved ${personName}'s ${svcName}` : `${personName} approved your ${svcName}`,
                confirmed: isIncoming ? `${personName}'s ${svcName} confirmed` : `Your ${svcName} with ${personName} confirmed`,
                declined: isIncoming ? `You declined ${personName}'s ${svcName}` : `${personName} declined your ${svcName}`,
                cancelled: `${svcName} with ${personName} cancelled`,
              }
              const text = labels[b.status] || `${svcName} — ${b.status}`
              const petSuffix = petName ? ` for ${petName}` : ''
              const ago = getTimeAgo(b.created_at)
              return (
                <div key={b.id} className="p-3 flex items-start gap-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{text}{petSuffix}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ago}</p>
                  </div>
                </div>
              )
            })}
          {walkerBookings.length === 0 && clientBookings.length === 0 && (
            <div className="p-3 text-sm text-gray-400 text-center">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
