import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function AccountPets() {
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', breed: '', weight: '', age: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) loadPets()
  }, [user?.id])

  async function loadPets() {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    setPets(data || [])
  }

  function startAdd() {
    setEditing('new')
    setForm({ name: '', breed: '', weight: '', age: '', notes: '' })
  }

  function startEdit(pet) {
    setEditing(pet.id)
    setForm({ name: pet.name, breed: pet.breed || '', weight: pet.weight || '', age: pet.age || '', notes: pet.notes || '' })
  }

  async function save() {
    setSaving(true)
    if (editing === 'new') {
      await supabase.from('pets').insert({ user_id: user.id, ...form })
    } else {
      await supabase.from('pets').update(form).eq('id', editing)
    }
    setEditing(null)
    setSaving(false)
    await loadPets()
  }

  async function remove(id) {
    await supabase.from('pets').delete().eq('id', id)
    await loadPets()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pets</h1>
        <button
          onClick={startAdd}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Add pet
        </button>
      </div>

      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <input
                type="text"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="text"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {pets.map((pet) => (
          <div key={pet.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold">{pet.name}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600">{pet.breed}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-500 text-sm">{pet.weight}, {pet.age}</span>
              {pet.notes && (
                <p className="text-sm text-gray-400 mt-1">{pet.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(pet)} className="text-sm text-indigo-600 hover:text-indigo-700">
                Edit
              </button>
              <button onClick={() => remove(pet.id)} className="text-sm text-red-500 hover:text-red-600">
                Remove
              </button>
            </div>
          </div>
        ))}
        {pets.length === 0 && (
          <p className="text-gray-400 text-center py-8">No pets added yet.</p>
        )}
      </div>
    </div>
  )
}
