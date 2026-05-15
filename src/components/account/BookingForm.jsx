import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Plus, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { inviteCustomer, walkerCreateBooking } from '../../lib/api'
import { clientPriceCents } from '../../lib/utils'
import EntityPicker from './EntityPicker'
import CustomerForm from './CustomerForm'
import ServiceForm from './ServiceForm'
import InviteConsentModal from './InviteConsentModal'

export default function BookingForm({ onCreated, formId, onValidityChange, onSubmittingChange }) {
  const { walkerProfile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [service, setService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [mode, setMode] = useState('online')
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

  const stripeReady = !!walkerProfile?.stripe_charges_enabled
  const valid = !!(customer && service && date && time && (mode !== 'online' || stripeReady))

  useEffect(() => { onValidityChange?.(valid) }, [valid])
  useEffect(() => { onSubmittingChange?.(submitting) }, [submitting])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const endMin = time.split(':').map(Number).reduce((h, m) => h * 60 + m) + (service.duration_minutes || 30)
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    const apiMode = mode === 'online' ? 'send_link' : 'cash'
    const res = await walkerCreateBooking({
      client_id: customer.id,
      slots: [{ serviceId: service.id, date, time, endTime }],
      mode: apiMode,
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onCreated?.(res.data)
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <SelectionButton
          empty={!customer}
          emptyLabel="Add customer"
          onClick={() => setCustomerPickerOpen(true)}
          primary={customer?.name || 'Unnamed'}
          secondary={customer?.email}
        />

        <SelectionButton
          empty={!service}
          emptyLabel="Add service"
          onClick={() => setServicePickerOpen(true)}
          primary={service?.name}
          secondary={service ? `£${(clientPriceCents(service.price_cents) / 100).toFixed(2)} · ${service.duration_minutes} min` : null}
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
            <label className={`cursor-pointer flex items-center gap-2 p-3 border-2 rounded-lg text-sm ${mode === 'online' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
              <input type="radio" name="mode" value="online" checked={mode === 'online'} onChange={() => setMode('online')} className="text-indigo-600" />
              Online (Stripe)
            </label>
            <label className={`cursor-pointer flex items-center gap-2 p-3 border-2 rounded-lg text-sm ${mode === 'cash_on_arrival' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
              <input type="radio" name="mode" value="cash_on_arrival" checked={mode === 'cash_on_arrival'} onChange={() => setMode('cash_on_arrival')} className="text-indigo-600" />
              Cash on arrival
            </label>
          </div>
          {mode === 'online' && (
            stripeReady ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2">
                <Check size={14} /> Stripe connected
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-800">
                  <AlertTriangle size={14} /> Stripe isn't set up yet
                </div>
                <Link
                  to="/account/settings/stripe"
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline shrink-0"
                >
                  Connect Stripe
                </Link>
              </div>
            )
          )}
        </div>
      </form>

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
    </>
  )
}

function SelectionButton({ empty, emptyLabel, onClick, primary, secondary }) {
  if (empty) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition text-left"
      >
        <div className="w-9 h-9 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0">
          <Plus size={18} />
        </div>
        <span className="text-sm font-semibold text-indigo-700">{emptyLabel}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer w-full border border-gray-300 hover:border-indigo-300 rounded-lg px-3 py-2.5 flex items-center justify-between text-left transition"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      <ChevronDown size={16} className="text-gray-400 shrink-0" />
    </button>
  )
}
