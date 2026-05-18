import { useState, useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { EMAIL_RE, UK_POSTCODE_RE } from '@/utils/validators'
import SelectionButton from '@/shared/SelectionButton'
import Modal from '@/shared/Modal'
import PetForm from '@/features/pets/PetForm'

export default function CustomerForm({ initial, initialPets = [], onSubmit, formId, onValidityChange }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    postcode: initial?.postcode || '',
    notes: initial?.notes || '',
  }))
  const [pets, setPets] = useState(initialPets)
  const [petModalOpen, setPetModalOpen] = useState(false)
  const [petFormValid, setPetFormValid] = useState(false)
  const petFormId = useId()

  const nameValid = form.name.trim().length >= 2
  const emailValid = EMAIL_RE.test(form.email.trim())
  const postcodeOK = !form.postcode.trim() || UK_POSTCODE_RE.test(form.postcode.trim().toUpperCase())
  const valid = nameValid && emailValid && postcodeOK && pets.length > 0

  useEffect(() => { onValidityChange?.(valid) }, [valid])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    await onSubmit({
      owner: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        postcode: form.postcode.trim().toUpperCase() || null,
        notes: form.notes.trim() || null,
      },
      pets,
    })
  }

  function handlePetSubmit(payload) {
    setPets((p) => [...p, { ...payload, __tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }])
    setPetModalOpen(false)
  }

  function removePet(key) {
    setPets((p) => p.filter((pet) => (pet.id ?? pet.__tempId) !== key))
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="jane@example.com"
          />
          <p className="text-xs text-gray-400 mt-1">We'll email an invite so they can pay and manage bookings.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="07700 900000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postcode <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => update('postcode', e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="SW1A 1AA"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional, walker-only)</span>
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Anything to remember about this customer"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <SelectionButton
          empty
          emptyLabel="Add pet"
          onClick={() => setPetModalOpen(true)}
        />

        {pets.length > 0 && (
          <ul className="space-y-2">
            {pets.map((pet) => {
              const key = pet.id ?? pet.__tempId
              return (
                <li key={key} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{pet.name || 'Unnamed pet'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[pet.pet_type, pet.breed].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePet(key)}
                    className="cursor-pointer p-1 -m-1 text-gray-400 hover:text-red-500"
                    aria-label="Remove pet"
                  >
                    <X size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </form>

      <Modal
        open={petModalOpen}
        onClose={() => setPetModalOpen(false)}
        title="New pet"
        formId={petFormId}
        saveDisabled={!petFormValid}
      >
        {petModalOpen && (
          <PetForm
            formId={petFormId}
            onValidityChange={setPetFormValid}
            onSubmit={handlePetSubmit}
          />
        )}
      </Modal>
    </>
  )
}
