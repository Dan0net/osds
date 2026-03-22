import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function AccountDashboard() {
  const { user, walkerProfile: wp } = useAuth()
  const walkerSlug = wp?.slug

  const [clientBookings, setClientBookings] = useState([])
  const [walkerBookings, setWalkerBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: cb } = await supabase
        .from('bookings')
        .select('*, booking_items(*, services(*), pets(*)), walker_profiles(slug, business_name)')
        .eq('client_id', user.id)
        .order('booking_date', { ascending: false })
      setClientBookings(cb || [])

      if (wp) {
        const { data: wb } = await supabase
          .from('bookings')
          .select('*, booking_items(*, services(*), pets(*)), users!bookings_client_id_fkey(name)')
          .eq('walker_id', wp.id)
          .order('booking_date', { ascending: false })
        setWalkerBookings(wb || [])
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

  const activeStatuses = ['confirmed', 'requested', 'approved']

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
  const confirmedWalkerBookings = walkerBookings.filter((b) => b.status === 'confirmed')
  const totalRevenueCents = confirmedWalkerBookings.reduce((sum, b) => {
    const svc = b.booking_items?.[0]?.services
    return sum + (svc?.price_cents || 0)
  }, 0)

  function getServiceName(b) {
    return b.booking_items?.[0]?.services?.name || 'Service'
  }
  function getWalkerName(b) {
    return b.walker_profiles?.business_name || ''
  }
  function getClientName(b) {
    return b.users?.name || ''
  }
  function getPetName(b) {
    return b.booking_items?.[0]?.pets?.name || ''
  }

  async function handleApprove(id) {
    setActionLoading(id)
    const result = await apiFetch('approve-booking', {
      method: 'POST',
      body: JSON.stringify({ booking_id: id }),
    })
    setActionLoading(null)
    if (!result.error) {
      setWalkerBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'approved' } : b))
    }
  }

  async function handleDecline(id) {
    setActionLoading(id)
    const result = await apiFetch('decline-booking', {
      method: 'POST',
      body: JSON.stringify({ booking_id: id }),
    })
    setActionLoading(null)
    if (!result.error) {
      setWalkerBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'declined' } : b))
    }
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
                  {walkerSlug}.onestopdog.shop
                </a>
              </div>
            )}
          </>
        )}
      </div>

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
          </div>
        </div>
      )}

      {/* Pending walker requests */}
      {wp && pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Incoming requests</h2>
            <Link to="/account/bookings" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {pendingRequests.slice(0, 3).map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{getClientName(b)}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-600">{getServiceName(b)}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500">
                      {new Date(b.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex gap-1.5 ml-3 shrink-0">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading === b.id}
                      className="bg-green-600 text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === b.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDecline(b.id)}
                      disabled={actionLoading === b.id}
                      className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === b.id ? '...' : 'Decline'}
                    </button>
                  </div>
                </div>
              </div>
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
