import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { stripeDashboardLink, createCheckout } from '../../lib/api'
import { paymentStatusBadge, toneClass } from '../../lib/bookingStatus'
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
  const [actionLoading, setActionLoading] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: clientPayments } = await supabase
        .from('payments')
        .select('*, walker_profiles(business_name)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      let walkerPayments = []
      if (wp) {
        const { data } = await supabase
          .from('payments')
          .select('*, users!payments_client_id_fkey(name)')
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
    load()
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
      <ListPaneHeader title="Payments" />
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
        return (
          <ListItem
            key={p.id}
            to={`/account/money/${p.id}`}
            state={{ from: '/account/money' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.counterpart}</p>
              <div className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-400">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span className={`inline-block font-medium px-1.5 py-0.5 rounded ${toneClass(badge.tone)}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.type === 'paid' && p.status === 'awaiting_payment' && (
                <button
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActionLoading(p.id)
                    const res = await createCheckout(p.id)
                    if (res.data?.url) {
                      window.location.href = res.data.url
                    } else {
                      setActionLoading(null)
                    }
                  }}
                  disabled={!!actionLoading}
                  className="cursor-pointer bg-indigo-600 text-white text-xs font-medium px-2.5 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading === p.id ? '…' : 'Pay'}
                </button>
              )}
              <span className={`text-sm font-semibold ${p.type === 'received' ? 'text-green-600' : ''}`}>
                {p.type === 'received' ? '+' : '−'}£{((p.type === 'received' ? p.total_cents - (p.platform_fee_cents || 0) : p.total_cents) / 100).toFixed(2)}
              </span>
            </div>
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
