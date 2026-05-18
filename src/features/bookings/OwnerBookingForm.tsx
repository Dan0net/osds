import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useAuth } from '@/auth/useAuth'
import { useOwnerWalkers } from '@/queries/walkers'
import { usePets, useCreatePet } from '@/queries/pets'
import { useServices } from '@/queries/services'
import { useCreateBookingRequest } from '@/queries/bookings'
import { slotNetCents } from '@common/pricing'
import { clientPriceCents } from '@/utils/pricing'
import Modal from '@/shared/Modal'
import AvailabilityCalendar from '@/features/calendar/AvailabilityCalendar'
import EntityPicker from '@/shared/EntityPicker'
import PetForm from '@/features/pets/PetForm'
import SelectionButton from '@/shared/SelectionButton'
import BookingCard from './BookingCard'

export default function OwnerBookingForm({ open, onClose, onCreated, initialWalker = null, initialServiceId = null }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [walker, setWalker] = useState(null)
  const [selectedPet, setSelectedPet] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [walkerPickerOpen, setWalkerPickerOpen] = useState(false)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [servicePickerOpen, setServicePickerOpen] = useState(false)
  const [bookingService, setBookingService] = useState(null)

  const walkersQuery = useOwnerWalkers(open ? user?.id : null)
  const petsQuery = usePets(open ? user?.id : null)
  const servicesQuery = useServices(walker?.id, { activeOnly: true })
  const createPet = useCreatePet()
  const createBooking = useCreateBookingRequest()

  const walkers = useMemo(() => (walkersQuery.data || []).map((w) => w.walker), [walkersQuery.data])
  const pets = petsQuery.data || []
  const services = servicesQuery.data || []

  useEffect(() => {
    if (!open) return
    setStep(1)
    setWalker(initialWalker)
    setSelectedPet(null)
    setSelectedSlots([])
    setBookingService(null)
    setError(null)
    setSubmitting(false)
  }, [open])

  // Auto-select pet when there's only one.
  useEffect(() => {
    if (!open) return
    if (pets.length === 1 && !selectedPet) setSelectedPet(pets[0])
  }, [open, pets.length])

  // Apply initialServiceId once services are loaded for the selected walker.
  useEffect(() => {
    if (!walker) { setBookingService(null); return }
    if (initialServiceId && services.length > 0) {
      const match = services.find((s) => s.id === initialServiceId)
      if (match) setBookingService(match)
    }
  }, [walker?.id, initialServiceId, services.length])

  const serviceMap = useMemo(() => {
    const m = {}
    for (const s of services) m[s.id] = s
    return m
  }, [services])

  const step1Valid = !!(walker && selectedPet)
  const step2Valid = !!bookingService && selectedSlots.length > 0

  const sortedSlots = useMemo(
    () => selectedSlots
      .map((slot, i) => ({ slot, i }))
      .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || (a.slot.time || '').localeCompare(b.slot.time || '')),
    [selectedSlots],
  )

  function slotDisplay(slot) {
    const svc = serviceMap[slot.serviceId]
    if (!svc) return 0
    const net = slotNetCents(svc, {
      petCount: 1,
      isHoliday: !!slot.isHoliday,
      isOvernight: !!slot.isOvernight,
      nights: slot.nights || 1,
    })
    return clientPriceCents(net)
  }

  const totalDisplay = selectedSlots.reduce((sum, s) => sum + slotDisplay(s), 0)

  function removeSlot(idx) {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleCreatePet(payload) {
    try {
      return await createPet.mutateAsync({ userId: user.id, pet: payload })
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  async function handleSubmit() {
    if (!step2Valid) return
    setSubmitting(true)
    setError(null)
    const slots = selectedSlots.map((s) => ({
      serviceId: s.serviceId,
      date: s.date,
      time: s.time,
      endTime: s.endTime,
      endDate: s.endDate,
      isOvernight: !!s.isOvernight,
    }))
    const res = await createBooking.mutateAsync({
      walker_id: walker.id,
      pet_id: selectedPet?.id || null,
      slots,
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setStep(4)
  }

  useEffect(() => {
    if (step !== 4) return
    const id = setTimeout(() => onCreated?.(), 3000)
    return () => clearTimeout(id)
  }, [step])

  const title = step === 1
    ? 'Request booking'
    : step === 2
      ? 'Choose slots'
      : step === 3
        ? 'Review request'
        : 'Request sent'
  const saveLabel = step === 1 || step === 2 ? 'Next' : 'Send request'
  const stepValid = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step2Valid : false

  function handleSave() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) handleSubmit()
  }

  const petPrimary = selectedPet?.name
  const petSecondary = selectedPet
    ? [selectedPet.pet_type, selectedPet.breed].filter(Boolean).join(' · ')
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
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SelectionButton
              empty={!walker}
              emptyLabel="Choose walker"
              onClick={() => setWalkerPickerOpen(true)}
              primary={walker?.business_name}
              secondary={walker?.postcode}
            />
            {walker && (
              <SelectionButton
                empty={!selectedPet}
                emptyLabel="Choose pet"
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
              emptyLabel="Choose service"
              onClick={() => setServicePickerOpen(true)}
              primary={bookingService?.name}
              secondary={bookingService
                ? `£${(clientPriceCents(bookingService.price_cents) / 100).toFixed(2)} · ${bookingService.duration_minutes} min`
                : null}
            />
            {bookingService && (
              <div className="flex-1 min-h-0">
                <AvailabilityCalendar
                  walkerId={walker.id}
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Walker</p>
              <p className="text-sm font-medium">{walker?.business_name}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pet</p>
              <p className="text-sm font-medium">{selectedPet?.name}</p>
              {petSecondary && <p className="text-xs text-gray-500">{petSecondary}</p>}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 px-1">Slots</p>
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
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-semibold text-gray-900">£{(totalDisplay / 100).toFixed(2)}</span>
            </div>

            <p className="text-xs text-gray-500">
              {walker?.business_name || 'The walker'} will be notified to approve or decline. You'll pay once they approve.
            </p>
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
            <h3 className="mt-6 text-xl font-semibold text-gray-900">Request sent!</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              {walker?.business_name || 'The walker'} will be notified and can approve or decline.
            </p>
          </div>
        )}
      </Modal>

      <EntityPicker
        open={walkerPickerOpen}
        onClose={() => setWalkerPickerOpen(false)}
        title="Walker"
        items={walkers}
        searchFields={['business_name', 'postcode']}
        renderItem={(w, onSelect) => (
          <button
            key={w.id}
            type="button"
            onClick={onSelect}
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
              {w.users?.avatar_url ? (
                <img src={w.users.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (w.business_name?.charAt(0) || '?').toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{w.business_name || 'Walker'}</p>
              {w.postcode && <p className="text-xs text-gray-500 truncate">{w.postcode}</p>}
            </div>
          </button>
        )}
        onSelect={setWalker}
        emptyState="No walkers yet."
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
        onSelect={setBookingService}
        emptyState="This walker has no active services."
      />

      <EntityPicker
        open={petPickerOpen}
        onClose={() => setPetPickerOpen(false)}
        title="Pet"
        items={pets}
        searchFields={['name', 'breed']}
        renderItem={(p, onSelect) => (
          <button
            key={p.id}
            type="button"
            onClick={onSelect}
            className="cursor-pointer w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
          >
            <p className="text-sm font-medium">{p.name || 'Unnamed pet'}</p>
            <p className="text-xs text-gray-500">{[p.pet_type, p.breed].filter(Boolean).join(' · ') || '—'}</p>
          </button>
        )}
        FormComponent={PetForm}
        onSelect={setSelectedPet}
        onCreate={handleCreatePet}
        addLabel="Add pet"
        emptyState="No pets yet. Tap Add pet to add one."
      />
    </>
  )
}
