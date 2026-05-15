import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { inviteCustomer, walkerCreateBooking } from '../../lib/api'
import { loadWalkerCustomers } from '../../lib/customers'
import { clientPriceCents } from '../../lib/utils'
import EntityPicker from './EntityPicker'
import CustomerForm from './CustomerForm'
import ServiceForm from './ServiceForm'
import PetForm from './PetForm'
import InviteConsentModal from './InviteConsentModal'
import SelectionButton from './SelectionButton'

export default function BookingForm({ onCreated, formId, onValidityChange, onSubmittingChange }) {
  const { walkerProfile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [service, setService] = useState(null)
  const [selectedPets, setSelectedPets] = useState([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [mode, setMode] = useState('online')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [customerPets, setCustomerPets] = useState([])
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [servicePickerOpen, setServicePickerOpen] = useState(false)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  useEffect(() => {
    if (!walkerProfile) return
    loadCustomers()
    loadServices()
  }, [walkerProfile?.id])

  // When customer changes, load their pets and auto-select if exactly one.
  useEffect(() => {
    if (!customer) {
      setCustomerPets([])
      setSelectedPets([])
      return
    }
    let cancelled = false
    supabase
      .from('pets')
      .select('id, name, breed, pet_type')
      .eq('user_id', customer.id)
      .then(({ data }) => {
        if (cancelled) return
        const list = data || []
        setCustomerPets(list)
        setSelectedPets(list.length === 1 ? [list[0]] : [])
      })
    return () => { cancelled = true }
  }, [customer?.id])

  async function loadCustomers() {
    const list = await loadWalkerCustomers(walkerProfile.id)
    setCustomers(list.map((c) => c.client))
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

  async function handleInviteCustomer({ owner, pets: newPets }) {
    const { data, error: err } = await inviteCustomer(owner)
    if (err) {
      setError(err)
      return null
    }
    const newUser = data?.user
    if (!newUser) return null

    if (newPets?.length) {
      const rows = newPets.map((p) => {
        const { __tempId, id, ...rest } = p
        return { ...rest, user_id: newUser.id }
      })
      const { data: inserted, error: petError } = await supabase.from('pets').insert(rows).select()
      if (petError) {
        setError(`Customer added, but pets failed to save: ${petError.message}`)
      } else if (inserted?.length) {
        setCustomerPets(inserted)
        setSelectedPets(inserted)
      }
    }

    if (!customers.find((c) => c.id === newUser.id)) {
      setCustomers((prev) => [newUser, ...prev])
    }
    return newUser
  }

  function handleOpenCustomerPicker() {
    if (walkerProfile?.customer_invite_consent_at) setCustomerPickerOpen(true)
    else setConsentOpen(true)
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

  async function handleCreatePet(payload) {
    if (!customer) return null
    const { data, error: err } = await supabase
      .from('pets')
      .insert({ ...payload, user_id: customer.id })
      .select()
      .single()
    if (err) {
      setError(err.message)
      return null
    }
    setCustomerPets((prev) => [...prev, data])
    return data
  }

  const stripeReady = !!walkerProfile?.stripe_charges_enabled
  const valid = !!(customer && service && selectedPets.length > 0 && date && time && (mode !== 'online' || stripeReady))

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
      pet_ids: selectedPets.map((p) => p.id),
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

  const petPrimary = selectedPets.map((p) => p.name).filter(Boolean).join(' · ')
  const petSecondary = selectedPets.length === 1
    ? [selectedPets[0].pet_type, selectedPets[0].breed].filter(Boolean).join(' · ')
    : selectedPets.length > 1
      ? `${selectedPets.length} pets`
      : null

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <SelectionButton
          empty={!customer}
          emptyLabel="Add customer"
          onClick={handleOpenCustomerPicker}
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

        {customer && (
          <SelectionButton
            empty={selectedPets.length === 0}
            emptyLabel="Add pet"
            onClick={() => setPetPickerOpen(true)}
            primary={petPrimary}
            secondary={petSecondary}
          />
        )}

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

      <EntityPicker
        open={petPickerOpen}
        onClose={() => setPetPickerOpen(false)}
        title="Pets"
        items={customerPets}
        searchFields={['name', 'breed']}
        multiple
        initialSelected={selectedPets}
        renderItemContent={(p) => (
          <>
            <p className="text-sm font-medium text-gray-900 truncate">{p.name || 'Unnamed pet'}</p>
            <p className="text-xs text-gray-500 truncate">{[p.pet_type, p.breed].filter(Boolean).join(' · ') || '—'}</p>
          </>
        )}
        FormComponent={PetForm}
        onSelect={setSelectedPets}
        onCreate={handleCreatePet}
        addLabel="Add new pet"
        emptyState="No pets yet. Tap Add new pet to add one."
      />

      <InviteConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={() => { setConsentOpen(false); setCustomerPickerOpen(true) }}
      />
    </>
  )
}
