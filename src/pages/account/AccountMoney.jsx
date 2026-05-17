import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { stripeDashboardLink } from '../../lib/api'
import { paymentStatusBadge, toneClass, toneColor } from '../../lib/bookingStatus'
import { displayPaymentAmount } from '../../lib/utils'
import { getUnreadPaymentIds } from '../../lib/payments'
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst'
import ListDetailLayout from '../../components/account/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '../../components/account/ListPaneHeader'
import ListItem from '../../components/account/ListItem'
import FilterPills from '../../components/account/FilterPills'

const STATUS_FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'pending_approval', label: 'Requested', match: (p) => p.status === 'pending_approval' },
  { value: 'awaiting_payment', label: 'Awaiting', match: (p) => p.status === 'awaiting_payment' },
  { value: 'paid', label: 'Paid', match: (p) => p.status === 'paid' },
]

export default function AccountMoney() {
  const { user, walkerProfile: wp } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [unreadIds, setUnreadIds] = useState(() => new Set())

  async function load() {
    if (!user) return
    const { data: clientPayments } = await supabase
      .from('payments')
      .select('*, walker_profiles(business_name), bookings(services(name))')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    let walkerPayments = []
    if (wp) {
      const { data } = await supabase
        .from('payments')
        .select('*, users!payments_client_id_fkey(name), bookings(services(name))')
        .eq('walker_id', wp.id)
        .order('created_at', { ascending: false })
      walkerPayments = data || []
    }

    const merged = [
      ...(clientPayments || []).map((p) => ({
        ...p,
        type: 'paid',
        counterpart: p.walker_profiles?.business_name || 'Walker',
      })),
      ...walkerPayments.map((p) => ({
        ...p,
        type: 'received',
        counterpart: p.users?.name || 'Client',
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setPayments(merged)
    setLoading(false)
  }

  async function refreshUnread() {
    if (!user) return
    setUnreadIds(await getUnreadPaymentIds(user.id))
  }

  useEffect(() => {
    if (!user) return
    load()
    refreshUnread()
    const onMutated = () => { load(); refreshUnread() }
    window.addEventListener('account-data-mutated', onMutated)
    window.addEventListener('payments-read', refreshUnread)
    return () => {
      window.removeEventListener('account-data-mutated', onMutated)
      window.removeEventListener('payments-read', refreshUnread)
    }
  }, [user?.id, wp?.id])

  useAutoSelectFirst({ items: payments, getHref: (p) => `/account/money/${p.id}` })

  const counts = useMemo(() => {
    const out = { all: payments.length }
    for (const f of STATUS_FILTERS) if (f.value !== 'all') out[f.value] = payments.filter(f.match).length
    return out
  }, [payments])

  const filtered = useMemo(() => {
    const f = STATUS_FILTERS.find((x) => x.value === statusFilter)
    return f ? payments.filter(f.match) : payments
  }, [payments, statusFilter])

  const listHeader = (
    <>
      <ListPaneHeader title="Money" />
      <ListPaneSubrow>
        <FilterPills
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS.map(({ value, label }) => ({ value, label, count: counts[value] }))}
        />
      </ListPaneSubrow>
    </>
  )

  const list = loading ? (
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ) : filtered.length === 0 ? (
    <p className="text-gray-400 text-center py-8 text-sm">{statusFilter === 'all' ? 'No payments yet.' : 'No matching payments.'}</p>
  ) : (
    <>
      {filtered.map((p) => {
        const badge = paymentStatusBadge(p)
        const bookingsCount = p.bookings?.length || 0
        const firstService = p.bookings?.[0]?.services?.name
        const title = bookingsCount > 1
          ? `${p.counterpart} · ${bookingsCount} bookings`
          : (firstService ? `${p.counterpart} · ${firstService}` : p.counterpart)
        const viewerIsWalker = p.type === 'received'
        const amountCents = displayPaymentAmount(p, viewerIsWalker)
        const amount = `${viewerIsWalker ? '+' : '−'}£${(amountCents / 100).toFixed(2)}`
        const isUnread = unreadIds.has(p.id)
        return (
          <ListItem
            key={p.id}
            to={`/account/money/${p.id}`}
            state={{ from: '/account/money' }}
            accentColor={toneColor(badge.tone)}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>{title}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-sm font-semibold ${viewerIsWalker ? 'text-green-600' : ''}`}>
                {amount}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${toneClass(badge.tone)}`}>
                {badge.label}
              </span>
            </div>
            {isUnread && (
              <span aria-label="Unread" className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 self-center" />
            )}
          </ListItem>
        )
      })}
      {wp && (
        <div className="pt-3">
          <button
            onClick={async () => {
              const res = await stripeDashboardLink()
              if (res.data?.url) window.open(res.data.url, '_blank')
            }}
            className="w-full border border-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            Open Stripe Dashboard
          </button>
        </div>
      )}
    </>
  )

  return (
    <ListDetailLayout
      list={list}
      listHeader={listHeader}
      emptyDetail={<p className="text-sm text-gray-400">Select a payment.</p>}
    />
  )
}
