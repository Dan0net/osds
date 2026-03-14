import { useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { MOCK_PETS } from '../../lib/mockData'

export default function BookingFlow() {
  const { walker: walkerParam } = useParams()
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const location = useLocation()

  const slots = location.state?.slots || []
  const [selectedPetId, setSelectedPetId] = useState(MOCK_PETS[0]?.id || '')
  const [petNotes, setPetNotes] = useState('')

  const totalCents = slots.reduce((sum, s) => sum + s.priceCents, 0)
  const selectedPet = MOCK_PETS.find((p) => p.id === selectedPetId)

  function handleSubmit(e) {
    e.preventDefault()
    navigate(`${prefix}/confirmation`, {
      state: { slots, pet: selectedPet, petNotes, totalCents },
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
            {MOCK_PETS.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} — {pet.breed}, {pet.weight}
              </option>
            ))}
          </select>
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
            className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  )
}
