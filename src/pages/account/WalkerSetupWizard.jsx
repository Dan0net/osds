import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch, stripeConnectOnboard, stripeConnectCallback } from '../../lib/api'
import { clientPriceCents } from '../../lib/utils'
import ImageUpload from '../../components/ImageUpload'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const STEPS = [
  { key: 'basics', label: 'Business' },
  { key: 'page', label: 'Page' },
  { key: 'services', label: 'Services' },
  { key: 'availability', label: 'Hours' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'stripe', label: 'Payments' },
]

function StepProgress({ current }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition ${
            i === current ? 'bg-indigo-600 text-white' : i < current ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-4 h-0.5 ${i < current ? 'bg-indigo-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function WalkerSetupWizard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile, walkerProfile: wp, refreshProfile, completeSetup } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Step 1: Business basics
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')
  const [postcode, setPostcode] = useState('')
  const [slug, setSlug] = useState('')

  // Step 2: Page setup
  const [avatarUrl, setAvatarUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [themeColor, setThemeColor] = useState('#4f46e5')

  // Step 3: Services
  const [services, setServices] = useState([])
  const [svcForm, setSvcForm] = useState({ name: '', price_cents: '', duration_minutes: '30', service_type: 'standard', description: '' })
  const [editingSvc, setEditingSvc] = useState(null)
  const [svcSaving, setSvcSaving] = useState(false)

  // Step 4: Availability
  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => ({
      day, day_of_week: i + 1,
      enabled: i < 5, // Mon-Fri default
      start_time: '09:00', end_time: '17:00',
    })),
  )
  const [availSaved, setAvailSaved] = useState(false)

  // Step 5: Calendar sync
  const [icalImports, setIcalImports] = useState([])
  const [importForm, setImportForm] = useState({ label: '', url: '' })
  const [importError, setImportError] = useState(null)
  const [importValidating, setImportValidating] = useState(false)

  // Step 6: Stripe
  const [stripeStatus, setStripeStatus] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)

  // Done state
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!wp) return
    if (wp.setup_completed_at) {
      navigate('/account', { replace: true })
      return
    }

    // Handle Stripe return
    if (searchParams.get('stripe') === 'complete' || searchParams.get('stripe') === 'refresh') {
      setStep(5)
      searchParams.delete('stripe')
      setSearchParams(searchParams, { replace: true })
      refreshProfile()
    }

    // Initialize form state from existing profile
    setBusinessName(wp.business_name || '')
    setBio(wp.bio || '')
    setPostcode(wp.postcode || user?.user_metadata?.postcode || '')
    setSlug(wp.slug || '')
    setAvatarUrl(profile?.avatar_url || '')
    setCoverUrl(wp.cover_url || '')
    setThemeColor(wp.theme_color || '#4f46e5')

    // Load existing data
    loadServices()
    loadAvailability()
    loadIcalImports()
    loadStripeStatus()

    setLoading(false)
  }, [wp?.id])

  async function loadServices() {
    if (!wp) return
    const { data } = await supabase.from('services').select('*').eq('walker_id', wp.id).order('created_at')
    setServices(data || [])
  }

  async function loadAvailability() {
    if (!wp) return
    const { data } = await supabase.from('availability').select('*').eq('walker_id', wp.id)
    if (data && data.length > 0) {
      setAvailSaved(true)
      setAvailability(DAYS.map((day, i) => {
        const existing = data.find((a) => a.day_of_week === i + 1)
        return {
          day, day_of_week: i + 1, enabled: !!existing,
          start_time: existing?.start_time?.slice(0, 5) || '09:00',
          end_time: existing?.end_time?.slice(0, 5) || '17:00',
        }
      }))
    }
  }

  async function loadIcalImports() {
    if (!wp) return
    const { data } = await supabase.from('ical_imports').select('*').eq('walker_id', wp.id).order('created_at')
    setIcalImports(data || [])
  }

  async function loadStripeStatus() {
    if (!wp?.stripe_account_id) {
      setStripeStatus(null)
      return
    }
    try {
      const res = await stripeConnectCallback()
      setStripeStatus(res.data)
    } catch { /* ignore */ }
  }

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

  // --- Step handlers ---

  async function handleBasics() {
    if (!businessName.trim()) { setError('Business name is required.'); return }
    if (!postcode.trim()) { setError('Postcode is required.'); return }
    setError(null)
    setSaving(true)
    const { lat, lng } = await geocodePostcode(postcode.trim())
    const finalSlug = slug.trim() || wp.slug
    await supabase.from('walker_profiles').update({
      business_name: businessName.trim(),
      bio: bio.trim(),
      postcode: postcode.trim().toUpperCase(),
      lat, lng,
      slug: finalSlug,
    }).eq('id', wp.id)
    setSaving(false)
    setStep(1)
  }

  async function handlePage() {
    setSaving(true)
    await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id)
    await supabase.from('walker_profiles').update({
      cover_url: coverUrl || null,
      theme_color: themeColor,
    }).eq('id', wp.id)
    setSaving(false)
    setStep(2)
  }

  async function handleServices() {
    if (services.length === 0) { setError('Add at least one service.'); return }
    setError(null)
    setStep(3)
  }

  async function saveAvailabilityData() {
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
    setAvailSaved(true)
  }

  async function handleAvailability() {
    setSaving(true)
    await saveAvailabilityData()
    setSaving(false)
    setStep(4)
  }

  async function handleCalendar() {
    // Auto-save default availability if not yet saved
    if (!availSaved) {
      await saveAvailabilityData()
    }
    setStep(5)
  }

  async function handleStripe() {
    await handleFinish()
  }

  async function handleFinish() {
    // Auto-save default availability if never saved
    if (!availSaved) {
      await saveAvailabilityData()
    }
    await completeSetup('walker')
    setDone(true)
  }

  async function handleSkip() {
    if (!availSaved) await saveAvailabilityData()
    await completeSetup('walker')
    navigate('/account', { replace: true })
  }

  // --- Service CRUD ---
  function startAddSvc() {
    setEditingSvc('new')
    setSvcForm({ name: '', price_cents: '', duration_minutes: '30', service_type: 'standard', description: '' })
  }
  function startEditSvc(svc) {
    setEditingSvc(svc.id)
    setSvcForm({
      name: svc.name,
      price_cents: String(svc.price_cents / 100),
      duration_minutes: String(svc.duration_minutes),
      service_type: svc.service_type || 'standard',
      description: svc.description || '',
    })
  }
  async function saveSvc() {
    if (!svcForm.name.trim() || !svcForm.price_cents || !svcForm.duration_minutes) return
    setSvcSaving(true)
    const data = {
      name: svcForm.name.trim(),
      price_cents: Math.round(parseFloat(svcForm.price_cents) * 100),
      duration_minutes: parseInt(svcForm.duration_minutes),
      service_type: svcForm.service_type,
      description: svcForm.description?.trim() || '',
    }
    if (editingSvc === 'new') {
      await supabase.from('services').insert({ ...data, walker_id: wp.id })
    } else {
      await supabase.from('services').update(data).eq('id', editingSvc)
    }
    setEditingSvc(null)
    setSvcSaving(false)
    await loadServices()
  }
  async function deleteSvc(id) {
    await supabase.from('services').delete().eq('id', id)
    await loadServices()
  }

  // --- Calendar import ---
  async function addIcalImport() {
    setImportError(null)
    if (!importForm.label.trim() || !importForm.url.trim()) {
      setImportError('Label and URL are required.')
      return
    }
    if (!importForm.url.startsWith('https://')) {
      setImportError('URL must start with https://')
      return
    }
    setImportValidating(true)
    try {
      const res = await apiFetch('validate-ical-url', {
        method: 'POST',
        body: JSON.stringify({ url: importForm.url.trim() }),
      })
      if (!res.data?.valid) {
        setImportError(res.data?.error || 'Could not validate URL.')
        return
      }
    } catch {
      setImportError('Validation failed.')
      return
    } finally {
      setImportValidating(false)
    }
    await supabase.from('ical_imports').insert({
      walker_id: wp.id,
      label: importForm.label.trim(),
      url: importForm.url.trim(),
    })
    setImportForm({ label: '', url: '' })
    await loadIcalImports()
  }
  async function removeIcalImport(id) {
    await supabase.from('ical_imports').delete().eq('id', id)
    await loadIcalImports()
  }

  // --- Stripe ---
  async function handleConnectStripe() {
    setStripeLoading(true)
    try {
      const res = await stripeConnectOnboard({ return_path: '/account/setup' })
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch {
      setError('Failed to start Stripe setup.')
    } finally {
      setStripeLoading(false)
    }
  }

  if (loading || !wp) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  // Done screen
  if (done) {
    const domain = import.meta.env.VITE_DOMAIN || 'onestopdog.shop'
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl mb-2">Your page is live!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Share your link with clients to start receiving bookings.
          </p>
          <p className="text-sm font-medium text-indigo-600 mb-6">{wp.slug}.{domain}</p>
          <div className="space-y-3">
            <a
              href={`/w/${wp.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
            >
              View your page
            </a>
            <Link
              to="/account"
              className="block border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 text-sm"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <StepProgress current={step} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Business basics */}
      {step === 0 && (
        <div>
          <h2 className="text-xl text-center mb-1">Your business</h2>
          <p className="text-sm text-gray-500 text-center mb-6">This is how clients will find and see you.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About you</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                placeholder="Tell clients about yourself and your experience…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="SW1A 1AA"
              />
              <p className="text-xs text-gray-400 mt-1">Used to show you in nearby search results.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>onestopdog.shop/w/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none flex-1"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleBasics}
            disabled={saving}
            className="w-full mt-6 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next'}
          </button>
        </div>
      )}

      {/* Step 2: Page setup */}
      {step === 1 && (
        <div>
          <h2 className="text-xl text-center mb-1">Your page</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Make your page stand out. You can change these later.</p>
          <div className="space-y-5">
            <ImageUpload
              bucket="avatars"
              currentUrl={avatarUrl}
              onUpload={setAvatarUrl}
              aspect="circle"
              label="Profile photo"
            />
            <ImageUpload
              bucket="covers"
              currentUrl={coverUrl}
              onUpload={setCoverUrl}
              aspect="wide"
              label="Cover image"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-500">Used as your page accent colour</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(0)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={handlePage} disabled={saving} className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Next'}
            </button>
          </div>
          <button onClick={() => { setStep(2) }} className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">Skip this step</button>
        </div>
      )}

      {/* Step 3: Services */}
      {step === 2 && (
        <div>
          <h2 className="text-xl text-center mb-1">Your services</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Add at least one service so clients can book.</p>

          {services.length > 0 && (
            <div className="space-y-2 mb-4">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{svc.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      £{(svc.price_cents / 100).toFixed(2)} · {svc.duration_minutes}min
                      {svc.service_type === 'overnight' && ' · overnight'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditSvc(svc)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => deleteSvc(svc.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingSvc !== null ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service name</label>
                <input
                  type="text"
                  value={svcForm.name}
                  onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="30-min walk"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your price (£)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={svcForm.price_cents}
                    onChange={(e) => setSvcForm((f) => ({ ...f, price_cents: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="12.00"
                  />
                  {svcForm.price_cents && (
                    <p className="text-xs text-gray-400 mt-1">
                      Client pays £{(clientPriceCents(Math.round(parseFloat(svcForm.price_cents) * 100)) / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={svcForm.duration_minutes}
                    onChange={(e) => setSvcForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={svcForm.service_type}
                  onChange={(e) => setSvcForm((f) => ({ ...f, service_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="standard">Standard (single visit)</option>
                  <option value="overnight">Overnight</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={svcForm.description}
                  onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="What's included in this service"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveSvc} disabled={svcSaving} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {svcSaving ? 'Saving…' : 'Save service'}
                </button>
                <button onClick={() => setEditingSvc(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={startAddSvc} className="w-full border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium py-3 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition">
              + Add a service
            </button>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={handleServices} disabled={services.length === 0} className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Step 4: Availability */}
      {step === 3 && (
        <div>
          <h2 className="text-xl text-center mb-1">Your availability</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Set your regular working hours. You can adjust these any time.</p>
          <div className="space-y-2">
            {availability.map((a) => (
              <div key={a.day_of_week} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={() => setAvailability((prev) => prev.map((d) => d.day_of_week === a.day_of_week ? { ...d, enabled: !d.enabled } : d))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-sm ${a.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{a.day.slice(0, 3)}</span>
                </label>
                {a.enabled && (
                  <div className="flex items-center gap-1 text-sm">
                    <input
                      type="time"
                      value={a.start_time}
                      onChange={(e) => setAvailability((prev) => prev.map((d) => d.day_of_week === a.day_of_week ? { ...d, start_time: e.target.value } : d))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={a.end_time}
                      onChange={(e) => setAvailability((prev) => prev.map((d) => d.day_of_week === a.day_of_week ? { ...d, end_time: e.target.value } : d))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={handleAvailability} disabled={saving} className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Next'}
            </button>
          </div>
          <button onClick={() => { handleCalendar() }} className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">Skip this step</button>
        </div>
      )}

      {/* Step 5: Calendar sync */}
      {step === 4 && (
        <div>
          <h2 className="text-xl text-center mb-1">Calendar sync</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
            <p className="font-medium mb-2">Keep your availability accurate</p>
            <p className="mb-3">If you use Google Calendar, Apple Calendar, or Outlook to manage your schedule, link them here. When you're busy in your personal calendar, those times will automatically be blocked on your booking page — no double-bookings.</p>
            <p className="font-medium mb-1">How to get your calendar link:</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-700">
              <li><strong>Google Calendar:</strong> Settings → your calendar → "Secret address in iCal format"</li>
              <li><strong>Apple Calendar:</strong> Share calendar → copy the webcal:// link</li>
              <li><strong>Outlook:</strong> Settings → Shared calendars → Publish → copy the ICS link</li>
            </ul>
          </div>

          {icalImports.length > 0 && (
            <div className="space-y-2 mb-4">
              {icalImports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm">{imp.label}</span>
                  <button onClick={() => removeIcalImport(imp.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={importForm.label}
              onChange={(e) => setImportForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Calendar name (e.g. Personal)"
            />
            <input
              type="url"
              value={importForm.url}
              onChange={(e) => setImportForm((f) => ({ ...f, url: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="https://calendar.google.com/calendar/ical/…"
            />
            {importError && <p className="text-xs text-red-500">{importError}</p>}
            <button
              onClick={addIcalImport}
              disabled={importValidating}
              className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {importValidating ? 'Validating…' : 'Add calendar'}
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={handleCalendar} className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700">Next</button>
          </div>
          <button onClick={() => setStep(5)} className="block mx-auto mt-3 text-xs text-gray-400 hover:text-gray-600">Skip this step</button>
        </div>
      )}

      {/* Step 6: Stripe / Payments */}
      {step === 5 && (
        <div>
          <h2 className="text-xl text-center mb-1">Get paid</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Connect Stripe to accept online payments from clients.</p>

          <div className="bg-white border border-gray-200 rounded-lg p-5 text-center mb-6">
            {wp.stripe_account_id && stripeStatus?.charges_enabled ? (
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-700">Stripe connected</p>
                <p className="text-xs text-gray-400 mt-1">You're ready to accept payments.</p>
              </div>
            ) : wp.stripe_account_id ? (
              <div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-yellow-700 mb-3">Stripe onboarding incomplete</p>
                <button
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {stripeLoading ? 'Redirecting…' : 'Continue Stripe setup'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-1">Stripe lets you accept card payments securely.</p>
                <p className="text-xs text-gray-400 mb-4">You can still create cash bookings without connecting Stripe.</p>
                <button
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {stripeLoading ? 'Redirecting…' : 'Connect Stripe'}
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(4)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Back</button>
            <button onClick={handleFinish} className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700">
              {wp.stripe_account_id && stripeStatus?.charges_enabled ? 'Finish' : 'Finish without Stripe'}
            </button>
          </div>
        </div>
      )}

      {/* Skip setup link (not shown on done step) */}
      {step <= 5 && !done && (
        <button onClick={handleSkip} className="block mx-auto mt-6 text-xs text-gray-400 hover:text-gray-600">
          Skip setup
        </button>
      )}
    </div>
  )
}
