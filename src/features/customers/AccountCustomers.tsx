import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useWalkerCustomers, useAddCustomerWithPets } from '@/queries/customers'
import { useAutoSelectFirst } from '@/shared/useAutoSelectFirst'
import SearchList from '@/shared/list/SearchList'
import SearchInput from '@/shared/list/SearchInput'
import Modal from '@/shared/modal/Modal'
import CustomerForm from '@/features/customers/CustomerForm'
import InviteConsentModal from '@/features/customers/InviteConsentModal'
import MapButton from '@/shared/MapButton'
import ListDetailLayout from '@/shared/layout/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '@/shared/list/ListPaneHeader'
import ListItem from '@/shared/list/ListItem'
import PillSelect from '@/shared/form/PillSelect'
import { Spinner } from '@/shared/Spinner'
import Avatar from '@/shared/Avatar'
import Alert from '@/shared/Alert'
import Button from '@/shared/form/Button'
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
  recently_added: {
    label: 'Recently added',
    cmp: (a, b) => (b.client.created_at || '').localeCompare(a.client.created_at || ''),
  },
  name: {
    label: 'Name',
    cmp: (a, b) => (a.client.name || '').localeCompare(b.client.name || ''),
  },
  spend: {
    label: 'Total spend',
    cmp: (a, b) => (b.totalSpendCents || 0) - (a.totalSpendCents || 0),
  },
}

export default function AccountCustomers() {
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [addError, setAddError] = useState(null)
  const [formValid, setFormValid] = useState(false)
  const [sortKey, setSortKey] = useState('recent_booking')
  const [query, setQuery] = useState('')

  const customersQuery = useWalkerCustomers(walkerProfile?.id)
  const addCustomer = useAddCustomerWithPets()
  const customers = customersQuery.data || []
  const loading = customersQuery.isLoading

  function handleAddClick() {
    if (walkerProfile?.customer_invite_consent_at) {
      setAddOpen(true)
    } else {
      setConsentOpen(true)
    }
  }

  const sorted = useMemo(() => [...customers].sort(SORTS[sortKey].cmp), [customers, sortKey])
  useAutoSelectFirst({
    items: sorted,
    getHref: (c) => `/account/customers/${c.client.id}`,
    enabled: !!walkerProfile,
  })

  async function handleAddCustomer({ owner, pets }) {
    setAddError(null)
    const result = await addCustomer.mutateAsync({ owner, pets })
    if (result.error) {
      setAddError(result.error)
      return null
    }
    setAddOpen(false)
    if (result.data?.status === 'already_exists') {
      alert(`${result.data.user.name || 'This customer'} is already on OSDS — opening their profile.`)
    }
    if (result.data?.user?.id) navigate(`/account/customers/${result.data.user.id}`)
    return result.data?.user
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Customers are only available for walkers.</p>
  }

  const addButton = (
    <Button onClick={handleAddClick} aria-label="Add customer" className="h-8 px-3">
      <Plus size={16} />
      Add customer
    </Button>
  )

  const listHeader = (
    <>
      <ListPaneHeader title="Customers" right={addButton} />
      <ListPaneSubrow>
        <div className="space-y-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search customers…" />
          <PillSelect
            value={sortKey}
            onChange={setSortKey}
            options={Object.entries(SORTS).map(([k, v]) => ({ value: k, label: `Sort: ${v.label}` }))}
            fullWidth
          />
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
      searchFields={['client.name', 'client.email']}
      emptyState="No customers yet. Customers appear here once they've booked with you, or you can add one manually."
      renderItem={({ client, totalBookings, lastBookingDate, totalSpendCents }) => (
        <ListItem key={client.id} to={`/account/customers/${client.id}`}>
          <Avatar src={client.avatar_url} name={client.name} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{client.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 truncate">
              {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
              {lastBookingDate && ` · ${formatDayMonth(lastBookingDate)}`}
              {totalSpendCents > 0 && ` · ${formatGBP(totalSpendCents)}`}
            </p>
          </div>
          <MapButton postcode={client.postcode} size={20} />
        </ListItem>
      )}
    />
  )

  return (
    <>
      <ListDetailLayout
        list={list}
        listHeader={listHeader}
        emptyDetail={<p className="text-sm text-gray-400">Select a customer.</p>}
      />

      <InviteConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={() => { setConsentOpen(false); setAddOpen(true) }}
      />

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddError(null) }}
        title="New customer"
        formId="customer-form"
        saveDisabled={!formValid}
        saveLoading={addCustomer.isPending}
      >
        {addError && <Alert className="mb-4">{addError}</Alert>}
        <p className="text-xs text-gray-500 mb-4">
          They'll receive an email invite. They can pay any booking from the link without signing in.
        </p>
        <CustomerForm
          formId="customer-form"
          onSubmit={handleAddCustomer}
          onValidityChange={setFormValid}
        />
      </Modal>
    </>
  )
}
