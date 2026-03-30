import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { clientPriceCents } from '../lib/utils'
import ImageUpload from './ImageUpload'

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition ${
            i === current ? 'bg-indigo-600 scale-125' : i < current ? 'bg-indigo-300' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function OwnerSetupWizard() {
  const { user, profile, completeSetup } = useAuth()
  const [step, setStep] = useState(-1) // -1 = welcome
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false) // keeps wizard mounted after completeSetup

  // Step 0 state (about you)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [postcode, setPostcode] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Step 1 state (your pets)
  const [pets, setPets] = useState([{ name: '', breed: '', weight: '', age: '', notes: '' }])
  const [existingPets, setExistingPets] = useState([])

  // Booking intent state
  const [bookingIntent, setBookingIntent] = useState(null)
  const [bookingWalkerSlug, setBookingWalkerSlug] = useState(null)
  const [bookingWalker, setBookingWalker] = useState(null)
  const [selectedPetId, setSelectedPetId] = useState('')
  const [petNotes, setPetNotes] = useState('')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)

  // Find walkers state
  const [nearbyWalkers, setNearbyWalkers] = useState(null)
  const [searchingWalkers, setSearchingWalkers] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const hasBookingPath = !!(bookingIntent || bookingWalkerSlug)
  const totalSteps = hasBookingPath ? 4 : 3

  useEffect(() => {
    if (!user || !profile) return
    async function init() {
      const { data: userPets } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
      setExistingPets(userPets || [])

      setFirstName(profile.name || '')
      setEmail(profile.email || user.email || '')
      setPhone(profile.phone || '')
      setPostcode(profile.postcode || user.user_metadata?.postcode || '')
      setAvatarUrl(profile.avatar_url || '')

      const saved = localStorage.getItem('osds_bookingIntent')
      if (saved) {
        try {
          const intent = JSON.parse(saved)
          if (intent.savedAt && Date.now() - intent.savedAt < 24 * 60 * 60 * 1000) {
            setBookingIntent(intent)
          }
        } catch { /* ignore */ }
      }

      const walkerSlug = user.user_metadata?.booking_intent_walker
      if (walkerSlug) {
        setBookingWalkerSlug(walkerSlug)
        const { data: wp } = await supabase
          .from('walker_profiles')
          .select('id, slug, business_name, theme_color, user_id, users(avatar_url)')
          .eq('slug', walkerSlug)
          .maybeSingle()
        if (wp) setBookingWalker(wp)
      }

      // Derive starting step — skip already-completed steps
      let startStep = -1
      if (profile.postcode && profile.phone) startStep = 0
      if ((userPets || []).length > 0 && profile.postcode) startStep = 1

      setStep(startStep)
      setLoading(false)
    }
    init()
  }, [user, profile])

  async function geocodePostcode(pc) {
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
      const data = await res.json()
      if (data.status === 200 && data.result) {
        return { lat: data.result.latitude, lng: data.result.longitude }
      }
    } catch { /* ignore */ }
    return { lat: null, lng: null }
  }

  async function handleAboutYou() {
    if (!postcode.trim()) { setError('Postcode is required.'); return }
    setError(null)
    setSaving(true)
    const { lat, lng } = await geocodePostcode(postcode.trim())
    await supabase
      .from('users')
      .update({
        name: firstName.trim(),
        phone: phone.trim(),
        postcode: postcode.trim().toUpperCase(),
        lat, lng,
        avatar_url: avatarUrl || '',
      })
      .eq('id', user.id)
    setSaving(false)
    setStep(1)
  }

  async function handlePets() {
    const newPets = pets.filter((p) => p.name.trim())
    if (existingPets.length === 0 && newPets.length === 0) {
      setError('Please add at least one pet.')
      return
    }
    setError(null)
    setSaving(true)
    if (newPets.length > 0) {
      const rows = newPets.map((p) => ({
        user_id: user.id,
        name: p.name.trim(),
        breed: p.breed.trim(),
        weight: p.weight ? Number(p.weight) : null,
        age: p.age ? Number(p.age) : null,
        notes: p.notes.trim(),
      }))
      const { data } = await supabase.from('pets').insert(rows).select()
      if (data) setExistingPets((prev) => [...prev, ...data])
    }
    setSaving(false)
    setStep(2)
  }

  async function handleBookingSubmit() {
    if (!bookingIntent?.slots?.length) return
    setBookingSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('create-booking-request', {
        method: 'POST',
        body: JSON.stringify({
          walker_id: bookingIntent.walkerId,
          pet_id: selectedPetId || null,
          pet_notes: petNotes.trim() || null,
          slots: bookingIntent.slots.map((s) => ({
            date: s.date,
            time: s.time,
            endTime: s.endTime,
            endDate: s.endDate || s.date,
            serviceId: s.serviceId,
            isOvernight: s.isOvernight || false,
          })),
        }),
      })
      if (res.error) throw new Error(res.error)
      localStorage.removeItem('osds_bookingIntent')
      setBookingResult(res)
      setDone(true)
      await completeSetup('owner')
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setBookingSubmitting(false)
    }
  }

  async function handleFindWalkers() {
    setSearchingWalkers(true)
    setDone(true) // keep wizard mounted
    try {
      const pc = postcode.trim() || profile?.postcode
      const res = await fetch(`/.netlify/functions/search-walkers?postcode=${encodeURIComponent(pc)}`)
      const data = await res.json()
      setNearbyWalkers(data.data || [])
    } catch { setNearbyWalkers([]) }
    await completeSetup('owner')
    setSearchingWalkers(false)
  }

  async function handleSkip() {
    setDone(true)
    await completeSetup('owner')
  }

  function addPetRow() {
    setPets((prev) => [...prev, { name: '', breed: '', weight: '', age: '', notes: '' }])
  }

  function updatePet(index, field, value) {
    setPets((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function removePet(index) {
    setPets((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  // === BOOKING DONE SCREEN ===
  if (hasBookingPath && step === 3) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl mb-2">Booking request sent!</h2>
          <p className="text-gray-500 text-sm mb-6">
            The walker will review your request and send you a payment link once approved.
          </p>
          <Link to="/account/bookings" className="cursor-pointer inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm">
            View my bookings
          </Link>
        </div>
      </div>
    )
  }

  // === CONGRATS + FIND WALKERS SCREEN (non-booking) ===
  if (!hasBookingPath && step === 2) {
    // Searching or showing results
    if (searchingWalkers || nearbyWalkers !== null) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-12">
          {searchingWalkers ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Finding walkers near you…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl text-center mb-6">Walkers near you</h2>
              {nearbyWalkers.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No walkers found near your postcode yet. Check back soon!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {nearbyWalkers.map((walker) => (
                    <Link
                      key={walker.id}
                      to={`/w/${walker.slug}`}
                      className="cursor-pointer bg-white rounded-lg p-4 hover:shadow-md transition border border-gray-100"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base font-bold text-white overflow-hidden"
                          style={{ backgroundColor: walker.theme_color || '#4f46e5' }}
                        >
                          {walker.avatar_url ? (
                            <img src={walker.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : walker.business_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium">{walker.business_name}</h3>
                          {walker.avg_rating && (
                            <span className="text-yellow-500 text-xs">
                              {'★'.repeat(Math.round(walker.avg_rating))}
                              <span className="text-gray-400 ml-0.5">({walker.review_count})</span>
                            </span>
                          )}
                          <span className="text-xs text-gray-400 ml-1">{walker.distance_miles} mi</span>
                        </div>
                      </div>
                      {walker.services?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {walker.services.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {s.name} · £{(clientPriceCents(s.price_cents) / 100).toFixed(0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              <div className="text-center">
                <Link to="/account" className="cursor-pointer text-sm text-indigo-600 hover:underline">Go to dashboard</Link>
              </div>
            </>
          )}
        </div>
      )
    }

    // Congrats screen — before searching
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl mb-2">Congratulations!</h2>
        <p className="text-gray-500 mb-8">Your profile is complete. Let's find walkers near you.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setStep(1)}
            className="cursor-pointer border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleFindWalkers}
            disabled={searchingWalkers}
            className="cursor-pointer bg-indigo-600 text-white font-semibold px-8 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Find walkers near me
          </button>
        </div>
        <button
          onClick={handleSkip}
          className="cursor-pointer mt-6 text-xs text-gray-400 hover:text-gray-600"
        >
          Skip to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {/* Welcome screen */}
      {step === -1 && (
        <div className="text-center py-8">
          <div className="text-5xl mb-6">🐾</div>
          <h1 className="text-2xl font-semibold mb-2">Welcome to One Stop Dog Shop!</h1>
          <p className="text-gray-500 mb-2">Only 3 steps to start finding walkers for your pet.</p>
          <p className="text-sm text-gray-400 mb-8">It'll take less than a minute.</p>
          <button
            onClick={() => setStep(0)}
            className="cursor-pointer bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 text-sm"
          >
            Let's go!
          </button>
          <button
            onClick={handleSkip}
            className="cursor-pointer block mx-auto mt-6 text-xs text-gray-400 hover:text-gray-600"
          >
            Skip setup
          </button>
        </div>
      )}

      {step >= 0 && step < 2 && <StepIndicator current={step} total={totalSteps} />}

      {error && step >= 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Step 0: About you */}
      {step === 0 && (
        <div>
          <h2 className="text-xl text-center mb-1">About you</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Let's set up your profile.</p>
          <div className="flex justify-center mb-5">
            <ImageUpload
              bucket="avatars"
              currentUrl={avatarUrl}
              onUpload={setAvatarUrl}
              aspect="circle"
              label="Profile photo"
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Ellie"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="07123 456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="SW1A 1AA"
              />
            </div>
          </div>
          <button
            onClick={handleAboutYou}
            disabled={saving}
            className="cursor-pointer w-full mt-6 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next'}
          </button>
          <button
            onClick={handleSkip}
            className="cursor-pointer block mx-auto mt-6 text-xs text-gray-400 hover:text-gray-600"
          >
            Skip setup
          </button>
        </div>
      )}

      {/* Step 1: Your pets */}
      {step === 1 && (
        <div>
          <h2 className="text-xl text-center mb-1">Your pet{existingPets.length + pets.length > 1 ? 's' : ''}</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Tell us about your furry friend{existingPets.length + pets.length > 1 ? 's' : ''}.</p>

          {existingPets.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Already added:</p>
              <div className="space-y-1">
                {existingPets.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>{p.name}</span>
                    {p.breed && <span className="text-gray-400">· {p.breed}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {pets.map((pet, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {pets.length > 1 && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-500">Pet {idx + 1}</span>
                    <button type="button" onClick={() => removePet(idx)} className="cursor-pointer text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={pet.name}
                      onChange={(e) => updatePet(idx, 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Buddy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                      <input
                        type="text"
                        value={pet.breed}
                        onChange={(e) => updatePet(idx, 'breed', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="Labrador"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={pet.age}
                        onChange={(e) => updatePet(idx, 'age', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="3"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={pet.notes}
                      onChange={(e) => updatePet(idx, 'notes', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Nervous around other dogs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPetRow} className="cursor-pointer text-sm text-indigo-600 hover:underline mt-3">
            + Add another pet
          </button>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(0)}
              className="cursor-pointer flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePets}
              disabled={saving}
              className="cursor-pointer flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Next'}
            </button>
          </div>
          <button
            onClick={handleSkip}
            className="cursor-pointer block mx-auto mt-6 text-xs text-gray-400 hover:text-gray-600"
          >
            Skip setup
          </button>
        </div>
      )}

      {/* Step 2 (booking path): Complete booking */}
      {step === 2 && hasBookingPath && (
        <div>
          <h2 className="text-xl text-center mb-1">Complete your booking</h2>
          {bookingIntent?.slots?.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 text-center mb-6">Review and submit your booking request.</p>
              {bookingWalker && (
                <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-lg p-3">
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base font-bold text-white overflow-hidden"
                    style={{ backgroundColor: bookingWalker.theme_color || '#4f46e5' }}
                  >
                    {bookingWalker.users?.avatar_url ? (
                      <img src={bookingWalker.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : bookingWalker.business_name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{bookingWalker.business_name}</span>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg divide-y mb-4">
                {bookingIntent.slots.map((slot, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex justify-between">
                    <span>{slot.date} at {slot.time?.slice(0, 5)}</span>
                    <span className="text-gray-500">£{(slot.priceCents / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="px-3 py-2 text-sm font-medium flex justify-between">
                  <span>Total</span>
                  <span>£{(bookingIntent.slots.reduce((s, sl) => s + sl.priceCents, 0) / 100).toFixed(2)}</span>
                </div>
              </div>
              {existingPets.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Which pet?</label>
                  <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="cursor-pointer w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select a pet</option>
                    {existingPets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes for the walker <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Any special instructions…"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="cursor-pointer flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleBookingSubmit}
                  disabled={bookingSubmitting}
                  className="cursor-pointer flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {bookingSubmitting ? 'Submitting…' : 'Submit booking request'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center mb-6">
                Your selected time slots have expired, but we saved your walker.
              </p>
              {bookingWalker && (
                <Link
                  to={`/w/${bookingWalker.slug}`}
                  className="cursor-pointer block text-center bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 mb-4"
                >
                  Visit {bookingWalker.business_name} to re-select
                </Link>
              )}
              {bookingWalkerSlug && !bookingWalker && (
                <Link
                  to={`/w/${bookingWalkerSlug}`}
                  className="cursor-pointer block text-center bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 mb-4"
                >
                  Visit walker page to re-select
                </Link>
              )}
              <button
                onClick={async () => { setDone(true); await completeSetup('owner') }}
                className="cursor-pointer w-full border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
              >
                Skip to dashboard
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
