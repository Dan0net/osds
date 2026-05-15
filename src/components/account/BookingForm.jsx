import { useState, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { inviteCustomer, walkerCreateBooking } from '../../lib/api'
import { clientPriceCents } from '../../lib/utils'
import EntityPicker from './EntityPicker'
import CustomerForm from './CustomerForm'
import ServiceForm from './ServiceForm'
import InviteConsentModal from './InviteConsentModal'

export default function BookingForm({ onCreated, onCancel }) {
  const { walkerProfile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [service, setService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [mode, setMode] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [servicePickerOpen, setServicePickerOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  useEffect(() => {
    if (!walkerProfile) return
    loadCustomers()
    loadServices()
  }, [walkerProfile?.id])

  async function loadCustomers() {
    const { data } = await supabase
      .from('bookings')
      .select('users:client_id(id, name, email)')
      .eq('walker_id', walkerProfile.id)
    const seen = new Set()
    const unique = []
    for (const row of data || []) {
      if (row.users && !seen.has(row.users.id)) {
        seen.add(row.users.id)
        unique.push(row.users)
      }
    }
    setCustomers(unique)
  }

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('walker_id', walkerProfile.id)
      .eq('active', true)
      .order('created_at')
    setServices(data || [])
  }

  async function handleInviteCustomer(payload) {
    if (!walkerProfile?.customer_invite_consent_at) {
      setConsentOpen(true)
      return null
    }
    const { data, error: err } = await inviteCustomer(payload)
    if (err) {
      setError(err)
      return null
    }
    if (data?.user && !customers.find((c) => c.id === data.user.id)) {
      setCustomers((prev) => [data.user, ...prev])
    }
    return data?.user || null
  }

  async function handleCreateService(payload) {
    const { data, error: err } = await supabase
      .from('services')
      .insert({ ...payload, walker_id: walkerProfile.id, active: true })
      .select()
      .single()
    if (err) {
      setError(err.message)
      return null
    }
    setServices((prev) => [data, ...prev])
    return data
  }

  const valid = customer && service && date && time

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const endMin = time.split(':').map(Number).reduce((h, m) => h * 60 + m) + (service.duration_minutes || 30)
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    const res = await walkerCreateBooking({
      client_id: customer.id,
      slots: [{ serviceId: service.id, date, time, endTime }],
      mode,
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onCreated?.(res.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <PickerField
        label="Customer"
        value={customer ? `${customer.name}${customer.email ? ` · ${customer.email}` : ''}` : ''}
        placeholder="Select a customer…"
        onClick={() => setCustomerPickerOpen(true)}
      />

      <PickerField
        label="Service"
        value={service ? `${service.name} · £${(clientPriceCents(service.price_cents) / 100).toFixed(2)}` : ''}
        placeholder="Select a service…"
        onClick={() => setServicePickerOpen(true)}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`cursor-pointer flex items-center gap-2 p-3 border-2 rounded-lg text-sm ${mode === 'cash' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
            <input type="radio" name="mode" value="cash" checked={mode === 'cash'} onChange={() => setMode('cash')} className="text-indigo-600" />
            Mark as paid (cash)
          </label>
          <label className={`cursor-pointer flex items-center gap-2 p-3 border-2 rounded-lg text-sm ${mode === 'send_link' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
            <input type="radio" name="mode" value="send_link" checked={mode === 'send_link'} onChange={() => setMode('send_link')} className="text-indigo-600" />
            Send payment link
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!valid || submitting}
          className="cursor-pointer flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating…' : 'Create booking'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      <EntityPicker
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        title="Customer"
        items={customers}
        searchFields={['name', 'email']}
        renderItem={(c, onSelect) => (
          <button
            key={c.id}
            type="button"
            onClick={onSelect}
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
          >
            <p className="text-sm font-medium">{c.name || 'Unnamed'}</p>
            {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
          </button>
        )}
        FormComponent={CustomerForm}
        onSelect={setCustomer}
        onCreate={handleInviteCustomer}
        addLabel="Add new"
        emptyState="No customers yet."
      />

      <EntityPicker
        open={servicePickerOpen}
        onClose={() => setServicePickerOpen(false)}
        title="Service"
        items={services}
        searchFields={['name', 'description']}
        renderItem={(s, onSelect) => (
          <button
            key={s.id}
            type="button"
            onClick={onSelect}
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
          >
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-gray-500">
              £{(clientPriceCents(s.price_cents) / 100).toFixed(2)} · {s.duration_minutes} min
              {s.service_type === 'overnight' && ' · overnight'}
            </p>
          </button>
        )}
        FormComponent={ServiceForm}
        onSelect={setService}
        onCreate={handleCreateService}
        addLabel="Add new"
        emptyState="No services yet."
      />

      <InviteConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={() => setConsentOpen(false)}
      />
    </form>
  )
}

function PickerField({ label, value, placeholder, onClick }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-left hover:border-indigo-300 transition"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
    </div>
  )
}
