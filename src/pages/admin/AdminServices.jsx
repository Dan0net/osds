import { useState } from 'react'
import { MOCK_SERVICES } from '../../lib/mockData'

export default function AdminServices() {
  const [services, setServices] = useState(MOCK_SERVICES)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', price_cents: '', duration_minutes: '', service_type: 'standard' })

  function startEdit(service) {
    setEditing(service.id)
    setForm({
      name: service.name,
      price_cents: String(service.price_cents / 100),
      duration_minutes: String(service.duration_minutes),
      service_type: service.service_type || 'standard',
    })
  }

  function startAdd() {
    setEditing('new')
    setForm({ name: '', price_cents: '', duration_minutes: '', service_type: 'standard' })
  }

  function save() {
    const isOvernight = form.service_type === 'overnight'
    const newService = {
      name: form.name,
      price_cents: Math.round(parseFloat(form.price_cents) * 100),
      duration_minutes: isOvernight ? 30 : parseInt(form.duration_minutes),
      service_type: form.service_type,
    }
    if (editing === 'new') {
      setServices((prev) => [
        ...prev,
        {
          id: `svc-${Date.now()}`,
          walker_id: 'walker-1',
          active: true,
          ...newService,
        },
      ])
    } else {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editing ? { ...s, ...newService } : s,
        ),
      )
    }
    setEditing(null)
  }

  function toggleActive(id) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <button
          onClick={startAdd}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Add service
        </button>
      </div>

      {/* Edit/Add form */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service type
              </label>
              <select
                value={form.service_type}
                onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="standard">Standard</option>
                <option value="overnight">Overnight / Multi-night</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (£){form.service_type === 'overnight' ? ' per night' : ''}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price_cents}
                onChange={(e) => setForm({ ...form, price_cents: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            {form.service_type !== 'overnight' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={save}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(null)}
              className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Services list */}
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between ${
              !service.active ? 'opacity-50' : ''
            }`}
          >
            <div>
              <span className="font-semibold">{service.name}</span>
              {service.service_type === 'overnight' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  🌙 Overnight
                </span>
              )}
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-indigo-600 font-medium">
                £{(service.price_cents / 100).toFixed(2)}{service.service_type === 'overnight' ? ' / night' : ''}
              </span>
              {service.service_type !== 'overnight' && (
                <>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500 text-sm">
                    {service.duration_minutes} min
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(service.id)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {service.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => startEdit(service)}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
