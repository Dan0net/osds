import { useState, useEffect } from 'react'

const PET_TYPES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'other', label: 'Other' },
]

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
]

const YNS_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'unknown', label: 'Unknown' },
]

const YN_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
]

export default function PetForm({ initial, onSubmit, formId, onValidityChange }) {
  const [form, setForm] = useState(() => ({
    pet_type: initial?.pet_type || 'dog',
    name: initial?.name || '',
    breed: initial?.breed || '',
    weight: initial?.weight != null ? String(initial.weight) : '',
    birthday: initial?.birthday || '',
    sex: initial?.sex || '',
    spayed_neutered: initial?.spayed_neutered == null ? '' : (initial.spayed_neutered ? 'yes' : 'no'),
    house_trained: initial?.house_trained == null ? '' : (initial.house_trained ? 'yes' : 'no'),
    friendly_with_kids: initial?.friendly_with_kids || '',
    friendly_with_dogs: initial?.friendly_with_dogs || '',
    friendly_with_cats: initial?.friendly_with_cats || '',
    triggers: initial?.triggers || '',
    allergies: initial?.allergies || '',
    left_alone_hours: initial?.left_alone_hours != null ? String(initial.left_alone_hours) : '',
    medication: initial?.medication || '',
    vet_contact: initial?.vet_contact || '',
    emergency_contact_name: initial?.emergency_contact_name || '',
    emergency_contact_phone: initial?.emergency_contact_phone || '',
  }))

  const valid = !!(form.name.trim() && form.pet_type)

  useEffect(() => { onValidityChange?.(valid) }, [valid])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function ynToBool(v) {
    if (v === 'yes') return true
    if (v === 'no') return false
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    await onSubmit({
      pet_type: form.pet_type,
      name: form.name.trim(),
      breed: form.breed.trim() || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      birthday: form.birthday || null,
      sex: form.sex || null,
      spayed_neutered: ynToBool(form.spayed_neutered),
      house_trained: ynToBool(form.house_trained),
      friendly_with_kids: form.friendly_with_kids || null,
      friendly_with_dogs: form.friendly_with_dogs || null,
      friendly_with_cats: form.friendly_with_cats || null,
      triggers: form.triggers.trim() || null,
      allergies: form.allergies.trim() || null,
      left_alone_hours: form.left_alone_hours === '' ? null : parseInt(form.left_alone_hours),
      medication: form.medication.trim() || null,
      vet_contact: form.vet_contact.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    })
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <Section title="About">
        <RadioRow label="Pet type" value={form.pet_type} options={PET_TYPES} onChange={(v) => update('pet_type', v)} />
        <Text label="Name" value={form.name} onChange={(v) => update('name', v)} placeholder="Cedar" required />
        <Text label="Breed" value={form.breed} onChange={(v) => update('breed', v)} placeholder="Shiba Inu" />
        <Grid2>
          <Number label="Weight (kg)" value={form.weight} onChange={(v) => update('weight', v)} step="0.1" placeholder="10" />
          <Text label="Birthday" type="date" value={form.birthday} onChange={(v) => update('birthday', v)} />
        </Grid2>
        <RadioRow label="Sex" value={form.sex} options={SEX_OPTIONS} onChange={(v) => update('sex', v)} optional />
      </Section>

      <Section title="Behaviour">
        <RadioRow label="Friendly with kids" value={form.friendly_with_kids} options={YNS_OPTIONS} onChange={(v) => update('friendly_with_kids', v)} optional />
        <RadioRow label="Friendly with dogs" value={form.friendly_with_dogs} options={YNS_OPTIONS} onChange={(v) => update('friendly_with_dogs', v)} optional />
        <RadioRow label="Friendly with cats" value={form.friendly_with_cats} options={YNS_OPTIONS} onChange={(v) => update('friendly_with_cats', v)} optional />
        <RadioRow label="House trained" value={form.house_trained} options={YN_OPTIONS} onChange={(v) => update('house_trained', v)} optional />
        <Textarea label="Known triggers" value={form.triggers} onChange={(v) => update('triggers', v)} placeholder="e.g. un-neutered male dogs" />
        <Number label="Can be left alone (hours)" value={form.left_alone_hours} onChange={(v) => update('left_alone_hours', v)} placeholder="8" min="0" />
      </Section>

      <Section title="Health">
        <RadioRow label="Spayed / neutered" value={form.spayed_neutered} options={YN_OPTIONS} onChange={(v) => update('spayed_neutered', v)} optional />
        <Textarea label="Allergies" value={form.allergies} onChange={(v) => update('allergies', v)} placeholder="e.g. hayfever" />
        <Textarea label="Medication" value={form.medication} onChange={(v) => update('medication', v)} placeholder="Name, dose, frequency" />
      </Section>

      <Section title="Admin">
        <Textarea label="Vet contact" value={form.vet_contact} onChange={(v) => update('vet_contact', v)} placeholder="Practice name, phone, address" />
        <Grid2>
          <Text label="Emergency contact name" value={form.emergency_contact_name} onChange={(v) => update('emergency_contact_name', v)} />
          <Text label="Emergency contact phone" type="tel" value={form.emergency_contact_phone} onChange={(v) => update('emergency_contact_phone', v)} />
        </Grid2>
      </Section>
    </form>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  )
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function FieldLabel({ children, optional }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {optional && <span className="text-gray-400 font-normal"> (optional)</span>}
    </label>
  )
}

function Text({ label, value, onChange, placeholder, type = 'text', required, optional }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  )
}

function Number({ label, value, onChange, placeholder, step, min, optional }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min={min}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, optional }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  )
}

function RadioRow({ label, value, options, onChange, optional }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div className={`grid gap-2 ${options.length === 2 ? 'grid-cols-2' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer flex items-center justify-center gap-2 p-2 border-2 rounded-lg text-sm ${
              value === opt.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}
