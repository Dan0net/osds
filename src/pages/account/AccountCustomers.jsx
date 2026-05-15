import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { inviteCustomer } from '../../lib/api'
import SearchList from '../../components/account/SearchList'
import Modal from '../../components/Modal'
import CustomerForm from '../../components/account/CustomerForm'

const PAID_STATUSES = new Set(['confirmed', 'paid'])

export default function AccountCustomers() {
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState(null)

  useEffect(() => {
    if (!walkerProfile) return
    loadCustomers()
  }, [walkerProfile?.id])

  async function loadCustomers() {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('client_id, booking_date, users:client_id(id, name, email, avatar_url), payments(amount_cents, status)')
      .eq('walker_id', walkerProfile.id)
      .order('booking_date', { ascending: false })

    const map = new Map()
    for (const row of data || []) {
      if (!row.client_id || !row.users) continue
      const existing = map.get(row.client_id) || {
        client: row.users,
        totalBookings: 0,
        lastBookingDate: null,
        totalSpendCents: 0,
      }
      existing.totalBookings += 1
      if (!existing.lastBookingDate || row.booking_date > existing.lastBookingDate) {
        existing.lastBookingDate = row.booking_date
      }
      if (row.payments && PAID_STATUSES.has(row.payments.status)) {
        existing.totalSpendCents += row.payments.amount_cents || 0
      }
      map.set(row.client_id, existing)
    }
    setCustomers([...map.values()])
    setLoading(false)
  }

  async function handleAddCustomer(payload) {
    setSubmitting(true)
    setAddError(null)
    const { data, error } = await inviteCustomer(payload)
    setSubmitting(false)
    if (error) {
      setAddError(error)
      return null
    }
    setAddOpen(false)
    // Navigate to the new customer's detail page
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
          onAdd={() => setAddOpen(true)}
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
              </div>
            </Link>
          )}
        />
      )}

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddError(null) }} title="New customer">
        {addError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{addError}</div>
        )}
        <p className="text-xs text-gray-500 mb-4">
          They'll receive an email invite. They can pay any booking from the link without signing in.
        </p>
        <CustomerForm onSubmit={handleAddCustomer} onCancel={() => setAddOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  )
}
