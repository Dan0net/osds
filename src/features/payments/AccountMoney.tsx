import { useState, useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { paymentStatusBadge, toneClass, toneColor } from '@/utils/bookingStatus'
import { displayPaymentAmount } from '@/utils/pricing'
import {
  useClientPayments, useWalkerPayments, useUnreadPaymentIds,
  useMarkAllPaymentsRead, useStripeDashboardLink,
} from '@/queries/payments'
import { useAutoSelectFirst } from '@/shared/useAutoSelectFirst'
import ListDetailLayout from '@/shared/layout/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '@/shared/list/ListPaneHeader'
import ListItem from '@/shared/list/ListItem'
import FilterPills from '@/shared/form/FilterPills'
import { Spinner } from '@/shared/Spinner'

const STATUS_FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'pending_approval', label: 'Requested', match: (p) => p.status === 'pending_approval' },
  { value: 'awaiting_payment', label: 'Awaiting', match: (p) => p.status === 'awaiting_payment' },
  { value: 'paid', label: 'Paid', match: (p) => p.status === 'paid' },
]

export default function AccountMoney() {
  const { user, walkerProfile: wp } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')

  const clientQuery = useClientPayments(user?.id)
  const walkerQuery = useWalkerPayments(wp?.id)
  const unreadQuery = useUnreadPaymentIds(user?.id)
  const markAllRead = useMarkAllPaymentsRead(user?.id)
  const dashboardLink = useStripeDashboardLink()

  const loading = clientQuery.isLoading || (wp && walkerQuery.isLoading)
  const unreadIds = unreadQuery.data || []
  const unreadSet = useMemo(() => new Set(unreadIds), [unreadIds])

  const payments = useMemo(() => {
    const merged = [
      ...(clientQuery.data || []).map((p) => ({
        ...p, type: 'paid', counterpart: p.walker_profiles?.business_name || 'Walker',
      })),
      ...(walkerQuery.data || []).map((p) => ({
        ...p, type: 'received', counterpart: p.users?.name || 'Client',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return merged
  }, [clientQuery.data, walkerQuery.data])

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

  function handleMarkAllRead() {
    if (!unreadIds.length) return
    markAllRead.mutate(unreadIds)
  }

  async function openStripeDashboard() {
    const res = await dashboardLink.mutateAsync()
    if (res?.data?.url) window.open(res.data.url, '_blank')
  }

  const listHeader = (
    <>
      <ListPaneHeader title="Money" />
      <ListPaneSubrow>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPills
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map(({ value, label }) => ({ value, label, count: counts[value] }))}
          />
          {unreadIds.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="cursor-pointer ml-auto h-10 lg:h-8 px-4 lg:px-3 inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm lg:text-xs font-medium rounded-full"
            >
              Mark all read
            </button>
          )}
        </div>
      </ListPaneSubrow>
    </>
  )

  const list = loading ? (
    <div className="flex justify-center py-8"><Spinner /></div>
  ) : filtered.length === 0 ? (
    <p className="text-gray-400 text-center py-8 text-sm">
      {statusFilter === 'all' ? 'No payments yet.' : 'No matching payments.'}
    </p>
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
        const isUnread = unreadSet.has(p.id)
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
            onClick={openStripeDashboard}
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
