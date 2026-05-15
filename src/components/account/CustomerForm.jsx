import { useState } from 'react'
import { EMAIL_RE, UK_POSTCODE_RE } from '../../lib/validators'

export default function CustomerForm({ initial, onSubmit, onCancel, submitting = false }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    postcode: initial?.postcode || '',
    notes: initial?.notes || '',
  }))

  const nameValid = form.name.trim().length >= 2
  const emailValid = EMAIL_RE.test(form.email.trim())
  const postcodeOK = !form.postcode.trim() || UK_POSTCODE_RE.test(form.postcode.trim().toUpperCase())
  const valid = nameValid && emailValid && postcodeOK

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      postcode: form.postcode.trim().toUpperCase() || null,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!valid || submitting}
          className="cursor-pointer flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save'}
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
    </form>
  )
}
