import { useState, useEffect } from 'react'
import { clientPriceCents } from '../../lib/utils'

export default function ServiceForm({ initial, onSubmit, formId, onValidityChange }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    service_type: initial?.service_type || 'standard',
    price_cents: initial ? String(initial.price_cents / 100) : '',
    duration_minutes: initial ? String(initial.duration_minutes) : '',
    description: initial?.description || '',
  }))

  const valid = !!(form.name.trim() && form.price_cents && form.duration_minutes)

  useEffect(() => { onValidityChange?.(valid) }, [valid])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid) return
    await onSubmit({
      name: form.name.trim(),
      service_type: form.service_type,
      price_cents: Math.round(parseFloat(form.price_cents) * 100),
      duration_minutes: parseInt(form.duration_minutes),
      description: form.description.trim(),
    })
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="30-min walk"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={form.service_type}
          onChange={(e) => update('service_type', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
        >
          <option value="standard">Standard</option>
          <option value="overnight">Overnight</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your price (£)</label>
          <input
            type="number"
            step="0.01"
            value={form.price_cents}
            onChange={(e) => update('price_cents', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="12.00"
          />
          {form.price_cents && parseFloat(form.price_cents) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Client pays £{(clientPriceCents(Math.round(parseFloat(form.price_cents) * 100)) / 100).toFixed(2)}
              {form.service_type === 'overnight' ? '/night' : ''}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.service_type === 'overnight' ? 'Slot (min)' : 'Duration (min)'}
          </label>
          <input
            type="number"
            value={form.duration_minutes}
            onChange={(e) => update('duration_minutes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="30"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What's included in this service?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
    </form>
  )
}
