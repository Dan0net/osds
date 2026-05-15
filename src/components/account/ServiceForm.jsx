import { useState, useEffect } from 'react'
import { clientPriceCents } from '../../lib/utils'

export default function ServiceForm({ initial, onSubmit, formId, onValidityChange }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    service_type: initial?.service_type || 'standard',
    price_cents: initial ? String(initial.price_cents / 100) : '',
    duration_minutes: initial ? String(initial.duration_minutes) : '',
    holiday_rate_cents: initial?.holiday_rate_cents != null ? String(initial.holiday_rate_cents / 100) : '',
    extra_pet_rate_cents: initial?.extra_pet_rate_cents ? String(initial.extra_pet_rate_cents / 100) : '',
    blocks_slot: initial?.blocks_slot ?? true,
    buffer_after_minutes: initial?.buffer_after_minutes ? String(initial.buffer_after_minutes) : '',
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
      holiday_rate_cents: form.holiday_rate_cents.trim() ? Math.round(parseFloat(form.holiday_rate_cents) * 100) : null,
      extra_pet_rate_cents: form.extra_pet_rate_cents.trim() ? Math.round(parseFloat(form.extra_pet_rate_cents) * 100) : 0,
      blocks_slot: form.blocks_slot,
      buffer_after_minutes: form.buffer_after_minutes.trim() ? parseInt(form.buffer_after_minutes) : 0,
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard rate (£)</label>
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Holiday rate (£) <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.holiday_rate_cents}
            onChange={(e) => update('holiday_rate_cents', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="—"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional pet rate (£) <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.extra_pet_rate_cents}
            onChange={(e) => update('extra_pet_rate_cents', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="—"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buffer after appointment (min) <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="number"
          value={form.buffer_after_minutes}
          onChange={(e) => update('buffer_after_minutes', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">Block extra time after each booking for travel or clean-up.</p>
      </div>
      <label className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.blocks_slot}
          onChange={(e) => update('blocks_slot', e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-indigo-600"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Block the calendar</p>
          <p className="text-xs text-gray-500">When ticked, this booking takes up the slot so other customers can't book it.</p>
        </div>
      </label>
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
