import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { inviteCustomer } from '../../lib/api'
import { loadWalkerCustomers } from '../../lib/customers'
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst'
import SearchList from '../../components/account/SearchList'
import SearchInput from '../../components/account/SearchInput'
import Modal from '../../components/Modal'
import CustomerForm from '../../components/account/CustomerForm'
import InviteConsentModal from '../../components/account/InviteConsentModal'
import MapButton from '../../components/account/MapButton'
import ListDetailLayout from '../../components/account/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '../../components/account/ListPaneHeader'
import ListItem from '../../components/account/ListItem'
import PillSelect from '../../components/account/PillSelect'

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
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState(null)
  const [formValid, setFormValid] = useState(false)
  const [sortKey, setSortKey] = useState('recent_booking')
  const [query, setQuery] = useState('')

  function handleAddClick() {
    if (walkerProfile?.customer_invite_consent_at) {
      setAddOpen(true)
    } else {
      setConsentOpen(true)
    }
  }

  useEffect(() => {
    if (!walkerProfile) return
    loadCustomers()
  }, [walkerProfile?.id])

  async function loadCustomers() {
    setLoading(true)
    setCustomers(await loadWalkerCustomers(walkerProfile.id))
    setLoading(false)
  }

  const sorted = useMemo(() => [...customers].sort(SORTS[sortKey].cmp), [customers, sortKey])
  useAutoSelectFirst({
    items: sorted,
    getHref: (c) => `/account/customers/${c.client.id}`,
    enabled: !!walkerProfile,
  })

  async function handleAddCustomer({ owner, pets }) {
    setSubmitting(true)
    setAddError(null)
    const { data, error } = await inviteCustomer(owner)
    if (error) {
      setSubmitting(false)
      setAddError(error)
      return null
    }
    if (data?.user?.id && pets?.length) {
      const rows = pets.map((p) => {
        const { __tempId, id, ...rest } = p
        return { ...rest, user_id: data.user.id }
      })
      const { error: petError } = await supabase.from('pets').insert(rows)
      if (petError) {
        setSubmitting(false)
        setAddError(`Customer was added, but pets failed to save: ${petError.message}`)
        return null
      }
    }
    setSubmitting(false)
    setAddOpen(false)
    if (data?.status === 'already_exists') {
      alert(`${data.user.name || 'This customer'} is already on OSDS — opening their profile.`)
    }
    if (data?.user?.id) navigate(`/account/customers/${data.user.id}`)
    return data?.user
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Customers are only available for walkers.</p>
  }

  const addButton = (
    <button
      onClick={handleAddClick}
      aria-label="Add customer"
      className="cursor-pointer h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
    >
      <Plus size={16} />
      Add customer
    </button>
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
    <p className="text-sm text-gray-400 px-3 py-3">Loading…</p>
  ) : (
    <SearchList
      items={sorted}
      query={query}
      searchFields={['client.name', 'client.email']}
      emptyState="No customers yet. Customers appear here once they've booked with you, or you can add one manually."
      renderItem={({ client, totalBookings, lastBookingDate, totalSpendCents }) => (
        <ListItem key={client.id} to={`/account/customers/${client.id}`}>
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (client.name?.charAt(0) || '?').toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{client.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 truncate">
              {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
              {lastBookingDate && ` · ${new Date(lastBookingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
              {totalSpendCents > 0 && ` · £${(totalSpendCents / 100).toFixed(2)}`}
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
        saveLoading={submitting}
      >
        {addError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{addError}</div>
        )}
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
