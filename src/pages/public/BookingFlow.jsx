import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { resolveWalker } from '../../lib/walker'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { ChevronLeft, Calendar, Clock, Moon, PawPrint } from 'lucide-react'

export default function BookingFlow() {
  const { walker: walkerParam } = useParams()
  const slug = walkerParam || resolveWalker(window.location.hostname)
  const prefix = walkerParam ? `/w/${walkerParam}` : ''
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const stateSlots = location.state?.slots || []
  const stateWalkerId = location.state?.walkerId
  const [slots, setSlots] = useState(stateSlots)
  const [walkerId, setWalkerId] = useState(stateWalkerId)
  const [walker, setWalker] = useState(null)
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [petNotes, setPetNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showAddPet, setShowAddPet] = useState(false)
  const [newPet, setNewPet] = useState({ name: '', breed: '' })
  const [addingPet, setAddingPet] = useState(false)

  // Restore from localStorage if state was lost
  useEffect(() => {
    if (slots.length === 0) {
      const saved = localStorage.getItem('osds_bookingIntent')
      if (saved) {
        try {
          const intent = JSON.parse(saved)
          if (intent.savedAt && Date.now() - intent.savedAt < 24 * 60 * 60 * 1000) {
            setSlots(intent.slots || [])
            setWalkerId(intent.walkerId || null)
          }
        } catch { /* ignore */ }
      }
    }
  }, [])

  // Load walker info
  useEffect(() => {
    if (!slug) return
    supabase
      .from('walker_profiles')
      .select('id, slug, business_name, theme_color, users(name, avatar_url)')
      .eq('slug', slug)
      .single()
      .then(({ data }) => { if (data) setWalker(data) })
  }, [slug])

  // Load pets when logged in
  useEffect(() => {
    if (user) {
      supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
        .then(({ data }) => {
          setPets(data || [])
          if (data?.length > 0) setSelectedPetId(data[0].id)
        })
    }
  }, [user?.id])

  const totalCents = slots.reduce((sum, s) => sum + s.priceCents, 0)
  const selectedPet = pets.find((p) => p.id === selectedPetId)

  async function handleSubmit(e) {
    e.preventDefault()

    // If not logged in, redirect to login and come back
    if (!user) {
      localStorage.setItem('osds_bookingIntent', JSON.stringify({
        walkerSlug: slug, walkerId, slots, savedAt: Date.now(),
      }))
      navigate(`/login?returnTo=${encodeURIComponent(prefix + '/book')}`)
      return
    }

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

    if (walkerId) sessionStorage.removeItem(`osds_selectedSlots_${walkerId}`)
    localStorage.removeItem('osds_bookingIntent')
    navigate(`${prefix}/confirmation`, {
      state: { slots, pet: selectedPet, petNotes, totalCents, bookingIds: result.data?.bookingIds, walkerSlug: slug },
    })
  }

  if (slots.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No slots selected</h2>
        <p className="text-gray-500 text-sm mb-6">Go back to the calendar to pick your dates and times.</p>
        <Link
          to={prefix || '/'}
          className="cursor-pointer inline-block text-indigo-600 hover:underline text-sm"
        >
          ← Back to walker
        </Link>
      </div>
    )
  }

  const avatarUrl = walker?.users?.avatar_url

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="cursor-pointer p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold">Review your booking</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left — form */}
        <div className="lg:col-span-3">
          {/* Login prompt for guests */}
          {!user && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                You'll need to <Link to={`/login?returnTo=${encodeURIComponent(prefix + '/book')}`} className="font-semibold underline">log in</Link> or <Link to={`/signup?returnTo=${encodeURIComponent(prefix + '/book')}`} className="font-semibold underline">sign up</Link> to submit your booking request.
              </p>
            </div>
          )}

          {/* Pet selection — only when logged in */}
          {user && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Your pet</h2>
              <div className="border border-gray-200 rounded-xl p-4">
                {pets.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      value={selectedPetId}
                      onChange={(e) => setSelectedPetId(e.target.value)}
                      className="cursor-pointer w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}{pet.breed ? ` — ${pet.breed}` : ''}
                        </option>
                      ))}
                    </select>
                    {!showAddPet && (
                      <button
                        type="button"
                        onClick={() => setShowAddPet(true)}
                        className="cursor-pointer text-sm text-indigo-600 hover:underline"
                      >
                        + Add another pet
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <PawPrint size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No pets added yet</p>
                    <button
                      type="button"
                      onClick={() => setShowAddPet(true)}
                      className="cursor-pointer text-sm text-indigo-600 hover:underline"
                    >
                      + Add a pet
                    </button>
                  </div>
                )}

                {showAddPet && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
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
                        className="cursor-pointer bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {addingPet ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddPet(false); setNewPet({ name: '', breed: '' }) }}
                        className="cursor-pointer text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Notes for the walker</h2>
            <textarea
              rows={3}
              value={petNotes}
              onChange={(e) => setPetNotes(e.target.value)}
              placeholder="Any special needs, dietary requirements, or instructions…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
          >
            {submitting ? 'Submitting…' : user ? 'Submit booking request' : 'Log in to book'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            You won't be charged yet. The walker will review your request first.
          </p>
        </div>

        {/* Right — booking summary card */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Walker header */}
            {walker && (
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0"
                  style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : walker.business_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{walker.business_name}</p>
                  <p className="text-xs text-gray-500">{walker.users?.name}</p>
                </div>
              </div>
            )}

            {/* Slots */}
            <div className="divide-y divide-gray-100">
              {slots.map((slot, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      {slot.isOvernight ? <Moon size={14} className="text-gray-500" /> : <Clock size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{slot.serviceName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {slot.isOvernight && slot.endDate ? (
                          <> → {new Date(slot.endDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</>
                        ) : null}
                        {' · '}
                        {slot.isOvernight
                          ? `Drop-off ${slot.time} · Pick-up ${slot.endTime}`
                          : `${slot.time}–${slot.endTime}`}
                      </p>
                    </div>
                    <span className="text-sm font-medium shrink-0">£{(slot.priceCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold text-indigo-600">£{(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
