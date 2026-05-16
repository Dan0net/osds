import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check, AlertTriangle, X, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { inviteCustomer, walkerCreateBooking } from '../../lib/api'
import { loadWalkerCustomers } from '../../lib/customers'
import { clientPriceCents } from '../../lib/utils'
import { slotNetCents } from '../../lib/pricing'
import Modal from '../Modal'
import AvailabilityCalendar from '../AvailabilityCalendar'
import EntityPicker from './EntityPicker'
import CustomerForm from './CustomerForm'
import PetForm from './PetForm'
import ServiceForm from './ServiceForm'
import InviteConsentModal from './InviteConsentModal'
import SelectionButton from './SelectionButton'
import BookingCard from './BookingCard'

export default function BookingForm({ open, onClose, onCreated }) {
  const { walkerProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [customer, setCustomer] = useState(null)
  const [selectedPets, setSelectedPets] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [mode, setMode] = useState('online')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [customerPets, setCustomerPets] = useState([])
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [servicePickerOpen, setServicePickerOpen] = useState(false)
  const [bookingService, setBookingService] = useState(null)
  const [consentOpen, setConsentOpen] = useState(false)

  // Reset on open/close
  useEffect(() => {
    if (!open) return
    setStep(1)
    setCustomer(null)
    setSelectedPets([])
    setSelectedSlots([])
    setMode('online')
    setBookingService(null)
    setError(null)
    setSubmitting(false)
  }, [open])

  useEffect(() => {
    if (!walkerProfile || !open) return
    loadCustomers()
    loadServices()
  }, [walkerProfile?.id, open])

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
    setCustomers(list.map((c) => ({ ...c.client, _petCount: c.petCount, _lastBookingDate: c.lastBookingDate })))
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

  const serviceMap = useMemo(() => {
    const m = {}
    for (const s of services) m[s.id] = s
    return m
  }, [services])

  const stripeReady = !!walkerProfile?.stripe_charges_enabled
  const petCount = selectedPets.length

  const step1Valid = !!(customer && selectedPets.length > 0)
  const step2Valid = !!bookingService && selectedSlots.length > 0
  const step3Valid = mode === 'cash_on_arrival' || stripeReady

  const sortedSlots = useMemo(
    () => selectedSlots
      .map((slot, i) => ({ slot, i }))
      .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || (a.slot.time || '').localeCompare(b.slot.time || '')),
    [selectedSlots],
  )

  function slotNet(slot) {
    const svc = serviceMap[slot.serviceId]
    if (!svc) return 0
    return slotNetCents(svc, {
      petCount,
      isHoliday: !!slot.isHoliday,
      isOvernight: !!slot.isOvernight,
      nights: slot.nights || 1,
    })
  }

  function slotDisplay(slot) {
    const net = slotNet(slot)
    return mode === 'cash_on_arrival' ? net : clientPriceCents(net)
  }

  const totalDisplay = selectedSlots.reduce((sum, s) => sum + slotDisplay(s), 0)

  function toggleHoliday(idx) {
    setSelectedSlots((prev) => prev.map((s, i) => i === idx ? { ...s, isHoliday: !s.isHoliday } : s))
  }

  function removeSlot(idx) {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!step3Valid) return
    setSubmitting(true)
    setError(null)
    const apiMode = mode === 'online' ? 'send_link' : 'cash'
    const slots = selectedSlots.map((s) => ({
      serviceId: s.serviceId,
      date: s.date,
      time: s.time,
      endTime: s.endTime,
      endDate: s.endDate,
      isOvernight: !!s.isOvernight,
      isHoliday: !!s.isHoliday,
    }))
    const res = await walkerCreateBooking({
      client_id: customer.id,
      pet_ids: selectedPets.map((p) => p.id),
      slots,
      mode: apiMode,
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onCreated?.(res.data)
  }

  const title = step === 1 ? 'New booking' : step === 2 ? 'Choose slots' : 'Review & pay'
  const saveLabel = step < 3 ? 'Next' : 'Create booking'
  const stepValid = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid

  function handleSave() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else handleSubmit()
  }

  const petPrimary = selectedPets.map((p) => p.name).filter(Boolean).join(' · ')
  const petSecondary = selectedPets.length === 1
    ? [selectedPets[0].pet_type, selectedPets[0].breed].filter(Boolean).join(' · ')
    : selectedPets.length > 1
      ? `${selectedPets.length} pets`
      : null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        title={title}
        onSave={handleSave}
        saveLabel={saveLabel}
        saveDisabled={!stepValid}
        saveLoading={submitting}
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SelectionButton
              empty={!customer}
              emptyLabel="Add customer"
              onClick={handleOpenCustomerPicker}
              primary={customer?.name || 'Unnamed'}
              secondary={customer?.email}
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 h-full flex flex-col">
            <SelectionButton
              empty={!bookingService}
              emptyLabel="Add service"
              onClick={() => setServicePickerOpen(true)}
              primary={bookingService?.name}
              secondary={bookingService
                ? `£${(clientPriceCents(bookingService.price_cents) / 100).toFixed(2)} · ${bookingService.duration_minutes} min`
                : null}
            />
            {bookingService && (
              <div className="flex-1 min-h-0">
                <AvailabilityCalendar
                  walkerId={walkerProfile.id}
                  services={services}
                  initialServiceId={bookingService.id}
                  value={selectedSlots}
                  onChange={setSelectedSlots}
                  hideFooter
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              {sortedSlots.map(({ slot, i }) => {
                const svc = serviceMap[slot.serviceId]
                return (
                  <BookingCard
                    key={i}
                    serviceName={svc?.name || 'Service'}
                    date={slot.date}
                    endDate={slot.endDate}
                    startTime={slot.time}
                    endTime={slot.endTime}
                    right={
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          £{(slotDisplay(slot) / 100).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(i)}
                          className="cursor-pointer p-1 -m-1 text-gray-400 hover:text-red-500"
                          aria-label="Remove slot"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => toggleHoliday(i)}
                      className={`mt-2 cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        slot.isHoliday
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Sparkles size={12} /> Holiday rate
                    </button>
                  </BookingCard>
                )
              })}
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

            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-semibold text-gray-900">£{(totalDisplay / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>

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
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name || 'Unnamed'}</p>
              {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
            </div>
            <p className="text-xs text-gray-500 shrink-0">{c._petCount || 0} {c._petCount === 1 ? 'pet' : 'pets'}</p>
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
        onSelect={(s) => { setBookingService(s); setSelectedSlots([]) }}
        onCreate={handleCreateService}
        addLabel="Add new"
        emptyState="No services yet. Tap Add new to create one."
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
