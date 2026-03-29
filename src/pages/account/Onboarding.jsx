import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { clientPriceCents } from '../../lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Onboarding() {
  const { user, profile, walkerProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const isWalker = profile?.user_type === 'walker'
  const totalSteps = isWalker ? 4 : 2
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Walker step 1: business profile
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')

  // Walker step 2: services
  const [services, setServices] = useState([])
  const [svcForm, setSvcForm] = useState({ name: '', price_cents: '', duration_minutes: '30', service_type: 'standard' })
  const [showSvcForm, setShowSvcForm] = useState(false)

  // Walker step 3: availability
  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => ({
      day, day_of_week: i + 1, enabled: false,
      start_time: '09:00', end_time: '17:00',
    })),
  )

  // Owner step 1: pet
  const [petForm, setPetForm] = useState({ name: '', breed: '', weight: '', age: '', notes: '' })
  const [pets, setPets] = useState([])

  // Redirect if onboarding already completed
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/account', { replace: true })
    }
  }, [profile?.onboarding_completed])

  // Load existing data if any
  useEffect(() => {
    if (!user) return
    if (walkerProfile) {
      setBusinessName(walkerProfile.business_name || '')
      setBio(walkerProfile.bio || '')
      setCity(walkerProfile.city || '')
      setPostcode(walkerProfile.postcode || '')
      // Load services
      supabase.from('services').select('*').eq('walker_id', walkerProfile.id).order('created_at')
        .then(({ data }) => setServices(data || []))
      // Load availability
      supabase.from('availability').select('*').eq('walker_id', walkerProfile.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAvailability(DAYS.map((day, i) => {
              const existing = data.find((a) => a.day_of_week === i + 1)
              return {
                day, day_of_week: i + 1, enabled: !!existing,
                start_time: existing?.start_time?.slice(0, 5) || '09:00',
                end_time: existing?.end_time?.slice(0, 5) || '17:00',
              }
            }))
          }
        })
    }
    supabase.from('pets').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setPets(data || []))
  }, [user?.id, walkerProfile?.id])

  function canAdvance() {
    if (isWalker) {
      if (step === 1) return businessName.trim().length > 0
      if (step === 2) return services.length > 0
      if (step === 3) return availability.some((a) => a.enabled)
      return true
    } else {
      if (step === 1) return true // pets are optional
      return true
    }
  }

  async function handleNext() {
    setError(null)
    setSaving(true)
    try {
      if (isWalker) {
        if (step === 1) {
          await saveWalkerProfile()
        } else if (step === 2) {
          // Services already saved individually
        } else if (step === 3) {
          await saveAvailability()
        } else if (step === 4) {
          // Stripe step — handled separately
        }
      } else {
        // Owner flow
        if (step === 1) {
          // Pets already saved individually
        }
      }

      if (step < totalSteps) {
        setStep(step + 1)
      } else {
        await completeOnboarding()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveWalkerProfile() {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!walkerProfile) {
      const { error: wpErr } = await supabase.from('walker_profiles').insert({
        user_id: user.id,
        slug,
        business_name: businessName,
        bio,
        city,
        postcode,
        calendar_feed_token: crypto.randomUUID(),
      })
      if (wpErr) throw wpErr
    } else {
      const { error: wpErr } = await supabase.from('walker_profiles').update({
        business_name: businessName,
        bio,
        city,
        postcode,
      }).eq('id', walkerProfile.id)
      if (wpErr) throw wpErr
    }
    await refreshProfile()
  }

  async function addService() {
    if (!svcForm.name || !svcForm.price_cents) return
    setError(null)
    const wp = walkerProfile
    if (!wp) {
      setError('Please complete step 1 first')
      return
    }
    const { error: err } = await supabase.from('services').insert({
      walker_id: wp.id,
      name: svcForm.name,
      price_cents: Math.round(parseFloat(svcForm.price_cents) * 100),
      duration_minutes: parseInt(svcForm.duration_minutes) || 30,
      service_type: svcForm.service_type,
    })
    if (err) { setError(err.message); return }
    const { data } = await supabase.from('services').select('*').eq('walker_id', wp.id).order('created_at')
    setServices(data || [])
    setSvcForm({ name: '', price_cents: '', duration_minutes: '30', service_type: 'standard' })
    setShowSvcForm(false)
  }

  async function removeService(id) {
    await supabase.from('services').delete().eq('id', id)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  async function saveAvailability() {
    const wp = walkerProfile
    if (!wp) return
    await supabase.from('availability').delete().eq('walker_id', wp.id)
    const enabled = availability.filter((a) => a.enabled)
    if (enabled.length > 0) {
      await supabase.from('availability').insert(
        enabled.map((a) => ({
          walker_id: wp.id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        })),
      )
    }
  }

  async function addPet() {
    if (!petForm.name.trim()) return
    setError(null)
    const { error: err } = await supabase.from('pets').insert({ user_id: user.id, ...petForm })
    if (err) { setError(err.message); return }
    const { data } = await supabase.from('pets').select('*').eq('user_id', user.id).order('created_at')
    setPets(data || [])
    setPetForm({ name: '', breed: '', weight: '', age: '', notes: '' })
  }

  async function removePet(id) {
    await supabase.from('pets').delete().eq('id', id)
    setPets((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleStripeConnect() {
    setSaving(true)
    const res = await apiFetch('stripe-connect-onboard', { method: 'POST' })
    if (res.data?.url) {
      window.location.href = res.data.url
    } else {
      setError(res.error || 'Failed to start Stripe setup')
      setSaving(false)
    }
  }

  async function completeOnboarding() {
    await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id)
    await refreshProfile()
    navigate('/account', { replace: true })
  }

  function toggleDay(dayOfWeek) {
    setAvailability((prev) => prev.map((a) => a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a))
  }
  function updateTime(dayOfWeek, field, value) {
    setAvailability((prev) => prev.map((a) => a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a))
  }

  // --- Render ---
  const stepLabels = isWalker
    ? ['Business profile', 'Services', 'Availability', 'Get paid']
    : ['Add your pet', 'Find a walker']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold">
              {isWalker ? 'Set up your walker page' : 'Get started'}
            </h1>
            <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {stepLabels.map((label, i) => (
              <span key={i} className={`text-xs ${i < step ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {isWalker ? (
          <>
            {/* Walker Step 1: Business profile */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Tell us about your business</h2>
                <p className="text-sm text-gray-500">This info appears on your public walker page.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
                  <input
                    type="text" value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Ellie's Dog Walking"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    rows={3} value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell pet owners about yourself and your experience..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City / Town</label>
                    <input
                      type="text" value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Edinburgh"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text" value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. EH1 1AA"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Walker Step 2: Services */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Add your services</h2>
                <p className="text-sm text-gray-500">What do you offer? Add at least one service to get started.</p>

                {services.length > 0 && (
                  <div className="space-y-2">
                    {services.map((svc) => (
                      <div key={svc.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{svc.name}</span>
                          {svc.service_type === 'overnight' && (
                            <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">overnight</span>
                          )}
                          <span className="text-gray-400 mx-2">·</span>
                          <span className="text-indigo-600 text-sm font-medium">£{(svc.price_cents / 100).toFixed(2)}</span>
                          <span className="text-gray-400 mx-2">·</span>
                          <span className="text-gray-500 text-xs">{svc.duration_minutes} min</span>
                        </div>
                        <button onClick={() => removeService(svc.id)} className="text-sm text-red-500 hover:text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                {showSvcForm ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service name</label>
                        <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                          placeholder="e.g. 30 min walk"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select value={svcForm.service_type} onChange={(e) => setSvcForm({ ...svcForm, service_type: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
                          <option value="standard">Standard</option>
                          <option value="overnight">Overnight</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your price (£)</label>
                        <input type="number" step="0.01" value={svcForm.price_cents} onChange={(e) => setSvcForm({ ...svcForm, price_cents: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        {svcForm.price_cents && parseFloat(svcForm.price_cents) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Client pays £{(clientPriceCents(Math.round(parseFloat(svcForm.price_cents) * 100)) / 100).toFixed(2)}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                        <input type="number" value={svcForm.duration_minutes} onChange={(e) => setSvcForm({ ...svcForm, duration_minutes: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addService} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Save service</button>
                      <button onClick={() => setShowSvcForm(false)} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSvcForm(true)} className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-full text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    + Add a service
                  </button>
                )}
              </div>
            )}

            {/* Walker Step 3: Availability */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Set your availability</h2>
                <p className="text-sm text-gray-500">Which days and hours are you available? You can change this anytime.</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  {availability.map((slot) => (
                    <div key={slot.day_of_week} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-28">
                        <input type="checkbox" checked={slot.enabled} onChange={() => toggleDay(slot.day_of_week)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className={`text-sm ${slot.enabled ? 'font-medium' : 'text-gray-400'}`}>{slot.day}</span>
                      </label>
                      {slot.enabled && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={slot.start_time} onChange={(e) => updateTime(slot.day_of_week, 'start_time', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm" />
                          <span className="text-gray-400">–</span>
                          <input type="time" value={slot.end_time} onChange={(e) => updateTime(slot.day_of_week, 'end_time', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Walker Step 4: Stripe */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Get paid</h2>
                <p className="text-sm text-gray-500">Connect your Stripe account to receive payments from clients. You can skip this and set it up later.</p>

                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center space-y-4">
                  {walkerProfile?.stripe_account_id ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-green-700 font-medium">Stripe connected</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl">💳</div>
                      <p className="text-sm text-gray-600">
                        Stripe handles secure payments. You'll be redirected to complete setup, then brought back here.
                      </p>
                      <button
                        onClick={handleStripeConnect}
                        disabled={saving}
                        className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving ? 'Redirecting…' : 'Connect Stripe'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Owner Step 1: Add pet */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Add your pet</h2>
                <p className="text-sm text-gray-500">Tell us about your furry friend. You can add more later.</p>

                {pets.length > 0 && (
                  <div className="space-y-2">
                    {pets.map((pet) => (
                      <div key={pet.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{pet.name}</span>
                          {pet.breed && <><span className="text-gray-400 mx-2">·</span><span className="text-gray-600 text-sm">{pet.breed}</span></>}
                        </div>
                        <button onClick={() => removePet(pet.id)} className="text-sm text-red-500 hover:text-red-600">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                        placeholder="e.g. Buddy"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                      <input type="text" value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                        placeholder="e.g. Labrador"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                      <input type="text" value={petForm.weight} onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                        placeholder="e.g. 25kg"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input type="text" value={petForm.age} onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                        placeholder="e.g. 3 years"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={petForm.notes} onChange={(e) => setPetForm({ ...petForm, notes: e.target.value })}
                      placeholder="Any special needs or info for walkers..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  {petForm.name.trim() && (
                    <button onClick={addPet} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">
                      Save pet
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Owner Step 2: Find a walker */}
            {step === 2 && (
              <div className="space-y-4 text-center">
                <h2 className="text-xl font-semibold">Find a walker</h2>
                <p className="text-sm text-gray-500">Browse local walkers or finish setup and explore later.</p>
                <div className="text-6xl py-4">🔍</div>
                <button
                  onClick={() => { completeOnboarding(); navigate('/walkers') }}
                  className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700"
                >
                  Browse walkers
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer nav */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-lg mx-auto flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : null}
            disabled={step === 1}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={completeOnboarding}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Skip for now
            </button>
            {/* Don't show Next on Stripe step if not connected (use the connect button instead) */}
            {!(isWalker && step === 4 && !walkerProfile?.stripe_account_id) && (
              <button
                onClick={handleNext}
                disabled={saving || !canAdvance()}
                className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : step === totalSteps ? 'Finish' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
