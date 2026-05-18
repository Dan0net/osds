import { useState, useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useOwnerWalkers } from '@/queries/walkers'
import { useAutoSelectFirst } from '@/shared/useAutoSelectFirst'
import SearchList from '@/shared/list/SearchList'
import SearchInput from '@/shared/list/SearchInput'
import ListDetailLayout from '@/shared/layout/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '@/shared/list/ListPaneHeader'
import ListItem from '@/shared/list/ListItem'
import { Spinner } from '@/shared/Spinner'
import Avatar from '@/shared/Avatar'
import { formatGBP, formatDayMonth } from '@/utils/formatting'

const SORTS = {
  recent_booking: {
    label: 'Recent booking',
    cmp: (a, b) => {
      if (a.lastBookingDate === b.lastBookingDate) return 0
      if (!a.lastBookingDate) return 1
      if (!b.lastBookingDate) return -1
      return a.lastBookingDate < b.lastBookingDate ? 1 : -1
    },
  },
  name: {
    label: 'Name',
    cmp: (a, b) => (a.walker.business_name || '').localeCompare(b.walker.business_name || ''),
  },
  spend: {
    label: 'Total spend',
    cmp: (a, b) => (b.totalSpendCents || 0) - (a.totalSpendCents || 0),
  },
}

export default function AccountWalkers() {
  const { user, walkerProfile } = useAuth()
  const [sortKey, setSortKey] = useState('recent_booking')
  const [query, setQuery] = useState('')

  const walkersQuery = useOwnerWalkers(user?.id)
  const walkers = walkersQuery.data || []
  const loading = walkersQuery.isLoading

  const sorted = useMemo(() => [...walkers].sort(SORTS[sortKey].cmp), [walkers, sortKey])
  useAutoSelectFirst({
    items: sorted,
    getHref: (w) => `/account/walkers/${w.walker.id}`,
    enabled: !!user,
  })

  if (walkerProfile) {
    return <p className="text-sm text-gray-500">Walkers list is for owner accounts.</p>
  }

  const listHeader = (
    <>
      <ListPaneHeader title="Walkers" />
      <ListPaneSubrow>
        <div className="space-y-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search walkers…" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="w-full h-9 px-3 bg-gray-100 rounded-full text-sm border-0 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>Sort: {v.label}</option>
            ))}
          </select>
        </div>
      </ListPaneSubrow>
    </>
  )

  const list = loading ? (
    <div className="flex justify-center py-8"><Spinner /></div>
  ) : (
    <SearchList
      items={sorted}
      query={query}
      searchFields={['walker.business_name', 'walker.postcode']}
      emptyState="No walkers yet. Walkers appear here once you've booked with one."
      renderItem={({ walker, totalBookings, lastBookingDate, totalSpendCents }) => (
        <ListItem key={walker.id} to={`/account/walkers/${walker.id}`}>
          <Avatar src={walker.users?.avatar_url} name={walker.business_name} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{walker.business_name || 'Walker'}</p>
            <p className="text-xs text-gray-500 truncate">
              {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
              {lastBookingDate && ` · ${formatDayMonth(lastBookingDate)}`}
              {totalSpendCents > 0 && ` · ${formatGBP(totalSpendCents)}`}
            </p>
          </div>
        </ListItem>
      )}
    />
  )

  return (
    <ListDetailLayout
      list={list}
      listHeader={listHeader}
      emptyDetail={<p className="text-sm text-gray-400">Select a walker.</p>}
    />
  )
}
