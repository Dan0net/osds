import { useState, useEffect, useMemo } from 'react'
import { Check, X, Sparkles } from 'lucide-react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useAuth } from '@/auth/useAuth'
import { useWalkerCustomers, useAddCustomerWithPets } from '@/queries/customers'
import { usePets, useCreatePet } from '@/queries/pets'
import { useServices, useCreateService } from '@/queries/services'
import { useWalkerCreateBooking } from '@/queries/bookings'
import { useProbeExternalEvents } from '@/queries/ical'
import { useStripeConnectOnboard } from '@/queries/profile'
import { slotNetCents } from '@common/pricing'
import Modal from '@/shared/modal/Modal'
import AvailabilityCalendar from '@/features/calendar/AvailabilityCalendar'
import EntityPicker from '@/shared/modal/EntityPicker'
import CustomerForm from '@/features/customers/CustomerForm'
import PetForm from '@/features/pets/PetForm'
import ServiceForm from '@/features/services/ServiceForm'
import InviteConsentModal from '@/features/customers/InviteConsentModal'
import SelectionButton from '@/shared/form/SelectionButton'
import BookingCard from './BookingCard'
import Alert from '@/shared/Alert'
import { formatGBP } from '@/utils/formatting'

export default function BookingForm({ open, onClose, onCreated }: any) {
  const { walkerProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [customer, setCustomer] = useState(null)
  const [selectedPets, setSelectedPets] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [mode, setMode] = useState('online')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [servicePickerOpen, setServicePickerOpen] = useState(false)
  const [bookingService, setBookingService] = useState(null)
  const [consentOpen, setConsentOpen] = useState(false)
  const [createdData, setCreatedData] = useState(null)

  const customersQuery = useWalkerCustomers(open ? walkerProfile?.id : null)
  const servicesQuery = useServices(open ? walkerProfile?.id : null, { activeOnly: true })
  const probeCalendar = useProbeExternalEvents(walkerProfile?.id)
  const petsQuery = usePets(customer?.id)
  const addCustomer = useAddCustomerWithPets()
  const createPet = useCreatePet()
  const createService = useCreateService(walkerProfile?.id)
  const createBooking = useWalkerCreateBooking()
  const onboardStripe = useStripeConnectOnboard()

  async function handleConnectStripe() {
    const res = await onboardStripe.mutateAsync({ return_path: '/account/settings/stripe' })
    if (res?.data?.url) window.open(res.data.url, '_blank', 'noopener,noreferrer')
  }

  const customers = useMemo(
    () => (customersQuery.data || []).map((c) => ({
      ...c.client, _petCount: c.petCount, _lastBookingDate: c.lastBookingDate,
    })),
    [customersQuery.data],
  )
  const services = servicesQuery.data || []
  const customerPets = petsQuery.data || []

  // Reset on open/close + fire external-calendar probe so step 2 calendar is fresh
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
    setCreatedData(null)
    if (walkerProfile?.id) probeCalendar.mutate()
  }, [open])

  useEffect(() => {
    if (step !== 4) return
    const id = setTimeout(() => onCreated?.(createdData), 3000)
    return () => clearTimeout(id)
  }, [step])

  // Auto-select pet if customer has exactly one.
  useEffect(() => {
    if (!customer) { setSelectedPets([]); return }
    if (customerPets.length === 1) setSelectedPets([customerPets[0]])
    else if (customerPets.length === 0) setSelectedPets([])
  }, [customer?.id, customerPets.length])

  async function handleInviteCustomer({ owner, pets: newPets }) {
    const result = await addCustomer.mutateAsync({ owner, pets: newPets })
    if (result.error) {
      setError(result.error)
      return null
    }
    const newUser = result.data?.user
    if (!newUser) return null
    if (result.pets?.length) setSelectedPets(result.pets)
    return newUser
  }

  function handleOpenCustomerPicker() {
    if (walkerProfile?.customer_invite_consent_at) setCustomerPickerOpen(true)
    else setConsentOpen(true)
  }

  async function handleCreatePet(payload) {
    if (!customer) return null
    try {
      return await createPet.mutateAsync({ userId: customer.id, pet: payload })
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  async function handleCreateService(payload) {
    try {
      return await createService.mutateAsync({ ...payload, active: true })
    } catch (err) {
      setError(err.message)
      return null
    }
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
    return slotNet(slot)
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
    const res = await createBooking.mutateAsync({
      client_id: customer.id,
      pet_ids: selectedPets.map((p) => p.id),
      slots,
      mode: apiMode,
    })
    setSubmitting(false)
    const r = res as any
    if (r.error) {
      setError(r.error)
      return
    }
    setCreatedData(r.data)
    setStep(4)
  }

  const title = step === 1 ? 'New booking' : step === 2 ? 'Choose slots' : step === 3 ? 'Review & pay' : 'Booking sent'
  const saveLabel = step < 3 ? 'Next' : 'Create booking'
  const stepValid = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : false

  function handleSave() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) handleSubmit()
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
        onBack={step > 1 && step < 4 ? () => setStep(step - 1) : undefined}
        title={title}
        onSave={step < 4 ? handleSave : undefined}
        saveLabel={saveLabel}
        saveDisabled={!stepValid}
        saveLoading={submitting}
      >
        {error && <Alert className="mb-4">{error}</Alert>}

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
                ? `${formatGBP(bookingService.price_cents)} · ${bookingService.duration_minutes} min`
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
                          {formatGBP(slotDisplay(slot))}
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
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-2 space-y-3">
                    <div className="flex items-start gap-2">
                      <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-indigo-900">
                        <p className="font-semibold">Take card payments online</p>
                        <p className="text-xs mt-1 text-indigo-800/80">Quick Stripe setup — opens in a new tab, your booking stays right here.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectStripe}
                      disabled={onboardStripe.isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-lg px-4 py-2.5"
                    >
                      {onboardStripe.isPending ? 'Opening Stripe…' : 'Connect Stripe'}
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-semibold text-gray-900">{formatGBP(totalDisplay)}</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 min-h-[20rem]">
            <DotLottieReact
              src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/lottie.json"
              autoplay
              loop
              className="w-40 h-40"
            />
            <h3 className="mt-6 text-xl font-semibold text-gray-900">Booking sent!</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              {mode === 'online'
                ? `${customer?.name || 'Your customer'} will get a notification to approve and pay.`
                : `${customer?.name || 'Your customer'} has been notified.`}
            </p>
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
              {formatGBP(s.price_cents)} · {s.duration_minutes} min
              {s.service_type === 'overnight' && ' · overnight'}
            </p>
          </button>
        )}
        FormComponent={ServiceForm}
        onSelect={setBookingService}
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
