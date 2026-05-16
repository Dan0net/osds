import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { inviteCustomer } from '../../lib/api'
import { loadWalkerCustomers } from '../../lib/customers'
import SearchList from '../../components/account/SearchList'
import Modal from '../../components/Modal'
import CustomerForm from '../../components/account/CustomerForm'
import InviteConsentModal from '../../components/account/InviteConsentModal'
import MapButton from '../../components/account/MapButton'

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

  return (
    <div>
      <h1 className="text-2xl mb-6">Customers</h1>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <SearchList
          items={customers}
          searchFields={['client.name', 'client.email']}
          placeholder="Search customers…"
          addLabel="Add customer"
          onAdd={handleAddClick}
          emptyState="No customers yet. Customers appear here once they've booked with you, or you can add one manually."
          renderItem={({ client, totalBookings, lastBookingDate, totalSpendCents }) => (
            <Link
              key={client.id}
              to={`/account/customers/${client.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                  {client.avatar_url ? (
                    <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (client.name?.charAt(0) || '?').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{client.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
                    {lastBookingDate && ` · last ${new Date(lastBookingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    {totalSpendCents > 0 && ` · £${(totalSpendCents / 100).toFixed(2)}`}
                  </p>
                </div>
                <MapButton postcode={client.postcode} size={24} />
              </div>
            </Link>
          )}
        />
      )}

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
    </div>
  )
}
