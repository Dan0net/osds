import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function BookingFlow() {
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Restore from sessionStorage if returning from auth redirect
  const stateSlots = location.state?.slots
  const stateWalkerId = location.state?.walkerId
  const [slots, setSlots] = useState([])
  const [walkerId, setWalkerId] = useState(null)
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [showAddPet, setShowAddPet] = useState(false)
  const [newPetForm, setNewPetForm] = useState({ name: '', breed: '', weight: '', age: '', notes: '' })
  const [savingPet, setSavingPet] = useState(false)

  useEffect(() => {
    if (stateSlots && stateSlots.length > 0) {
      setSlots(stateSlots)
      setWalkerId(stateWalkerId)
      sessionStorage.setItem('pendingBooking', JSON.stringify({ slots: stateSlots, walkerId: stateWalkerId }))
    } else {
      const saved = sessionStorage.getItem('pendingBooking')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setSlots(parsed.slots || [])
          setWalkerId(parsed.walkerId || null)
        } catch { /* ignore */ }
      }
    }
  }, [])

  // Clean up sessionStorage after successful submission
  function clearPendingBooking() {
    sessionStorage.removeItem('pendingBooking')
  }

  async function handleAddPet() {
    if (!newPetForm.name.trim()) return
    setSavingPet(true)
    const { data, error } = await supabase.from('pets').insert({ user_id: user.id, ...newPetForm }).select().single()
    setSavingPet(false)
    if (error) return
    setPets((prev) => [...prev, data])
    setSelectedPetId(data.id)
    setShowAddPet(false)
    setNewPetForm({ name: '', breed: '', weight: '', age: '', notes: '' })
  }
  const [petNotes, setPetNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const totalCents = slots.reduce((sum, s) => sum + s.priceCents, 0)
  const selectedPet = pets.find((p) => p.id === selectedPetId)

  useEffect(() => {
    if (user) {
      supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
        .then(({ data }) => {
          setPets(data || [])
          if (data && data.length > 0) setSelectedPetId(data[0].id)
        })
    }
  }, [user?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await apiFetch('create-booking-request', {
      method: 'POST',
      body: JSON.stringify({
        walker_id: walkerId,
        pet_id: selectedPetId || null,
        slots: slots.map((s) => ({
          date: s.date,
          time: s.time,
          endTime: s.endTime,
          endDate: s.endDate,
          serviceId: s.serviceId,
          isOvernight: s.isOvernight,
        })),
      }),
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    clearPendingBooking()
    navigate(`${prefix}/confirmation`, {
      state: { slots, pet: selectedPet, petNotes, totalCents, bookingIds: result.data?.bookingIds },
    })
  }

  if (slots.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">No slots selected.</p>
        <Link
          to={prefix || '/'}
          className="text-indigo-600 hover:underline"
        >
          ← Go back and select time slots
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Review Your Booking</h1>

      {/* Selected slots */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y mb-6">
        {slots.map((slot, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div>
              <span className="font-medium">
                {new Date(slot.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              {slot.isOvernight && slot.endDate ? (
                <>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-medium">
                    {new Date(slot.endDate).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">
                    Drop-off {slot.time} · Pick-up {slot.endTime}
                  </span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-purple-600 text-sm font-medium">
                    🌙 {slot.nights} night{slot.nights > 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">
                    {slot.time}–{slot.endTime}
                  </span>
                </>
              )}
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600">{slot.serviceName}</span>
            </div>
            <span className="font-semibold text-indigo-600">
              £{(slot.priceCents / 100).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="p-4 flex items-center justify-between bg-gray-50">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-indigo-600">
            £{(totalCents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Pet selection form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select pet
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} — {pet.breed}{pet.weight ? `, ${pet.weight}` : ''}
                </option>
              ))}
              {pets.length === 0 && <option value="">No pets added yet</option>}
            </select>
            <button
              type="button"
              onClick={() => setShowAddPet(!showAddPet)}
              className="border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              + Add pet
            </button>
          </div>
          {showAddPet && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" value={newPetForm.name} onChange={(e) => setNewPetForm({ ...newPetForm, name: e.target.value })}
                    placeholder="e.g. Buddy"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Breed</label>
                  <input type="text" value={newPetForm.breed} onChange={(e) => setNewPetForm({ ...newPetForm, breed: e.target.value })}
                    placeholder="e.g. Labrador"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
                  <input type="text" value={newPetForm.weight} onChange={(e) => setNewPetForm({ ...newPetForm, weight: e.target.value })}
                    placeholder="e.g. 25kg"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                  <input type="text" value={newPetForm.age} onChange={(e) => setNewPetForm({ ...newPetForm, age: e.target.value })}
                    placeholder="e.g. 3 years"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddPet} disabled={savingPet || !newPetForm.name.trim()}
                  className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingPet ? 'Saving...' : 'Save pet'}
                </button>
                <button type="button" onClick={() => setShowAddPet(false)}
                  className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes for the walker <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={petNotes}
            onChange={(e) => setPetNotes(e.target.value)}
            placeholder="Any special needs, extra instructions..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
