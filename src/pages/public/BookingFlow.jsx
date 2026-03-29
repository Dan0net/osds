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

  // Restore booking intent from localStorage if location.state was lost (e.g. after auth redirect)
  const stateSlots = location.state?.slots || []
  const stateWalkerId = location.state?.walkerId
  const [slots, setSlots] = useState(stateSlots)
  const [walkerId, setWalkerId] = useState(stateWalkerId)
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [petNotes, setPetNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showAddPet, setShowAddPet] = useState(false)
  const [newPet, setNewPet] = useState({ name: '', breed: '' })
  const [addingPet, setAddingPet] = useState(false)

  useEffect(() => {
    if (slots.length === 0) {
      const saved = localStorage.getItem('osds_bookingIntent')
      if (saved) {
        try {
          const intent = JSON.parse(saved)
          // Only restore if less than 30 minutes old
          if (intent.savedAt && Date.now() - intent.savedAt < 30 * 60 * 1000) {
            setSlots(intent.slots || [])
            setWalkerId(intent.walkerId || null)
          }
        } catch { /* ignore corrupt data */ }
        localStorage.removeItem('osds_bookingIntent')
      }
    }
  }, [])

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
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} — {pet.breed}{pet.weight ? `, ${pet.weight}` : ''}
              </option>
            ))}
            {pets.length === 0 && <option value="">No pets added</option>}
          </select>
          {!showAddPet ? (
            <button
              type="button"
              onClick={() => setShowAddPet(true)}
              className="text-xs text-indigo-600 hover:underline mt-1"
            >
              + Add a pet
            </button>
          ) : (
            <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newPet.name}
                  onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Pet name"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={newPet.breed}
                  onChange={(e) => setNewPet((p) => ({ ...p, breed: e.target.value }))}
                  placeholder="Breed"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={addingPet || !newPet.name.trim()}
                  onClick={async () => {
                    setAddingPet(true)
                    const { data } = await supabase
                      .from('pets')
                      .insert({ user_id: user.id, name: newPet.name.trim(), breed: newPet.breed.trim() })
                      .select('*')
                      .single()
                    if (data) {
                      setPets((prev) => [...prev, data])
                      setSelectedPetId(data.id)
                    }
                    setNewPet({ name: '', breed: '' })
                    setShowAddPet(false)
                    setAddingPet(false)
                  }}
                  className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addingPet ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddPet(false); setNewPet({ name: '', breed: '' }) }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
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
