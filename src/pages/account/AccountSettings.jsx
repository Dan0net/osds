import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { clientPriceCents } from '../../lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AccountSettings() {
  const { user, walkerProfile, refreshProfile } = useAuth()
  const isWalker = !!walkerProfile

  // Services
  const [services, setServices] = useState([])
  const [editingSvc, setEditingSvc] = useState(null)
  const [svcForm, setSvcForm] = useState({ name: '', price_cents: '', duration_minutes: '', service_type: 'standard' })
  const [svcLoading, setSvcLoading] = useState(false)

  // Availability
  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => ({
      day, day_of_week: i + 1, enabled: false,
      start_time: '09:00', end_time: '17:00',
    })),
  )
  const [availSaving, setAvailSaving] = useState(false)
  const [blockedDates, setBlockedDates] = useState([])
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })

  // Become a walker
  const [creatingWalker, setCreatingWalker] = useState(false)

  async function handleBecomeWalker() {
    setCreatingWalker(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()
      const name = prof?.name || user.email.split('@')[0]
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const { error: wpErr } = await supabase
        .from('walker_profiles')
        .insert({
          user_id: user.id,
          slug,
          business_name: name + "'s Dog Walking",
          calendar_feed_token: crypto.randomUUID(),
        })
      if (wpErr) throw wpErr
      await refreshProfile()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingWalker(false)
    }
  }

  // Calendar imports
  const [icalImports, setIcalImports] = useState([])
  const [importForm, setImportForm] = useState({ label: '', url: '' })
  const [importError, setImportError] = useState(null)
  const [importValidating, setImportValidating] = useState(false)
  const feedUrl = walkerProfile
    ? `https://onestopdog.shop/cal/${walkerProfile.id}/${walkerProfile.calendar_feed_token || 'not-set'}.ics`
    : ''
  const [copied, setCopied] = useState(false)

  // Load data on mount
  useEffect(() => {
    if (!walkerProfile) return
    loadServices()
    loadAvailability()
    loadBlockedDates()
    loadIcalImports()
    // Backfill calendar_feed_token if missing
    if (!walkerProfile.calendar_feed_token) {
      const token = crypto.randomUUID()
      supabase.from('walker_profiles')
        .update({ calendar_feed_token: token })
        .eq('id', walkerProfile.id)
        .then(() => {
          // Token will be picked up on next profile refresh
        })
    }
  }, [walkerProfile?.id])

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('walker_id', walkerProfile.id)
      .order('created_at')
    setServices(data || [])
  }

  async function loadAvailability() {
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('walker_id', walkerProfile.id)
    setAvailability(
      DAYS.map((day, i) => {
        const existing = (data || []).find((a) => a.day_of_week === i + 1)
        return {
          id: existing?.id,
          day, day_of_week: i + 1, enabled: !!existing,
          start_time: existing?.start_time?.slice(0, 5) || '09:00',
          end_time: existing?.end_time?.slice(0, 5) || '17:00',
        }
      }),
    )
  }

  async function loadBlockedDates() {
    const { data } = await supabase
      .from('blocked_dates')
      .select('*')
      .eq('walker_id', walkerProfile.id)
      .order('date')
    setBlockedDates(data || [])
  }


  // --- Services ---
  function startAddSvc() {
    setEditingSvc('new')
    setSvcForm({ name: '', price_cents: '', duration_minutes: '', service_type: 'standard' })
  }
  function startEditSvc(svc) {
    setEditingSvc(svc.id)
    setSvcForm({ name: svc.name, price_cents: String(svc.price_cents / 100), duration_minutes: String(svc.duration_minutes), service_type: svc.service_type || 'standard' })
  }
  async function saveSvc() {
    setSvcLoading(true)
    const data = {
      name: svcForm.name,
      price_cents: Math.round(parseFloat(svcForm.price_cents) * 100),
      duration_minutes: parseInt(svcForm.duration_minutes),
      service_type: svcForm.service_type,
    }
    if (editingSvc === 'new') {
      await supabase.from('services').insert({ ...data, walker_id: walkerProfile.id })
    } else {
      await supabase.from('services').update(data).eq('id', editingSvc)
    }
    setEditingSvc(null)
    setSvcLoading(false)
    await loadServices()
  }
  async function toggleActive(id) {
    const svc = services.find((s) => s.id === id)
    if (!svc) return
    await supabase.from('services').update({ active: !svc.active }).eq('id', id)
    await loadServices()
  }

  // --- Availability ---
  function toggleDay(dayOfWeek) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a)))
  }
  function updateTime(dayOfWeek, field, value) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a)))
  }
  async function saveAvailability() {
    setAvailSaving(true)
    // Delete all existing availability for this walker, then insert enabled days
    await supabase.from('availability').delete().eq('walker_id', walkerProfile.id)
    const enabled = availability.filter((a) => a.enabled)
    if (enabled.length > 0) {
      await supabase.from('availability').insert(
        enabled.map((a) => ({
          walker_id: walkerProfile.id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        })),
      )
    }
    setAvailSaving(false)
    await loadAvailability()
  }
  async function addBlockedDate() {
    if (!newBlock.date) return
    await supabase.from('blocked_dates').insert({
      walker_id: walkerProfile.id,
      date: newBlock.date,
      reason: newBlock.reason,
    })
    setNewBlock({ date: '', reason: '' })
    await loadBlockedDates()
  }
  async function removeBlockedDate(id) {
    await supabase.from('blocked_dates').delete().eq('id', id)
    await loadBlockedDates()
  }

  // --- Calendar imports ---
  async function loadIcalImports() {
    const { data } = await supabase
      .from('ical_imports')
      .select('*')
      .eq('walker_id', walkerProfile.id)
      .order('created_at')
    setIcalImports(data || [])
  }
  async function addIcalImport() {
    setImportError(null)
    if (!importForm.label.trim() || !importForm.url.trim()) {
      setImportError('Label and URL are required')
      return
    }
    if (!importForm.url.startsWith('https://')) {
      setImportError('URL must start with https://')
      return
    }

    // Validate URL returns actual iCal data before saving
    setImportValidating(true)
    try {
      const res = await apiFetch('validate-ical-url', {
        method: 'POST',
        body: JSON.stringify({ url: importForm.url.trim() }),
      })
      if (!res.data?.valid) {
        setImportError(res.data?.error || 'Could not validate URL')
        return
      }
    } catch {
      setImportError('Failed to validate URL')
      return
    } finally {
      setImportValidating(false)
    }

    const { error } = await supabase.from('ical_imports').insert({
      walker_id: walkerProfile.id,
      label: importForm.label.trim(),
      url: importForm.url.trim(),
    })
    if (error) {
      setImportError(error.message)
      return
    }
    setImportForm({ label: '', url: '' })
    await loadIcalImports()
  }
  async function removeIcalImport(id) {
    await supabase.from('ical_imports').delete().eq('id', id)
    await loadIcalImports()
  }
  function handleCopy() {
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  async function handleRegenerateToken() {
    if (!confirm('Regenerating will invalidate the current feed URL. Any calendars subscribed to it will stop updating. Continue?')) return
    const newToken = crypto.randomUUID()
    await supabase.from('walker_profiles')
      .update({ calendar_feed_token: newToken })
      .eq('id', walkerProfile.id)
    // Force page reload to pick up new token
    window.location.reload()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Walker settings */}
      {isWalker && (
        <>
          {/* Services */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Services</h2>
              <button onClick={startAddSvc} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">
                Add service
              </button>
            </div>

            {editingSvc && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={svcForm.service_type} onChange={(e) => setSvcForm({ ...svcForm, service_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
                      <option value="standard">Standard</option>
                      <option value="overnight">Overnight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your price (£)</label>
                    <input type="number" step="0.01" value={svcForm.price_cents} onChange={(e) => setSvcForm({ ...svcForm, price_cents: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                    {svcForm.price_cents && parseFloat(svcForm.price_cents) > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Client pays £{(clientPriceCents(Math.round(parseFloat(svcForm.price_cents) * 100)) / 100).toFixed(2)}
                        {svcForm.service_type === 'overnight' ? '/night' : ''}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{svcForm.service_type === 'overnight' ? 'Drop-off slot (min)' : 'Duration (min)'}</label>
                    <input type="number" value={svcForm.duration_minutes} onChange={(e) => setSvcForm({ ...svcForm, duration_minutes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={saveSvc} disabled={svcLoading} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{svcLoading ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditingSvc(null)} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {services.map((svc) => (
                <div key={svc.id} className={`bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between ${!svc.active ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-semibold">{svc.name}</span>
                    {svc.service_type === 'overnight' && (
                      <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">overnight</span>
                    )}
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-indigo-600 font-medium">£{(svc.price_cents / 100).toFixed(2)}{svc.service_type === 'overnight' ? '/night' : ''}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="text-gray-500 text-sm">Client: £{(clientPriceCents(svc.price_cents) / 100).toFixed(2)}{svc.service_type === 'overnight' ? '/night' : ''}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-gray-500 text-sm">{svc.duration_minutes} min</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(svc.id)} className="text-sm text-gray-500 hover:text-gray-700">{svc.active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => startEditSvc(svc)} className="text-sm text-indigo-600 hover:text-indigo-700">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Availability</h2>

            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-3">Weekly hours</h3>
              <div className="space-y-3">
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
              <button onClick={saveAvailability} disabled={availSaving} className="mt-3 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {availSaving ? 'Saving...' : 'Save schedule'}
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">Blocked dates</h3>
              <div className="flex gap-2 mb-4">
                <input type="date" value={newBlock.date} onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <input type="text" value={newBlock.reason} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  placeholder="Reason (optional)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addBlockedDate} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Block</button>
              </div>
              <div className="space-y-2">
                {blockedDates.map((block) => (
                  <div key={block.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium text-sm">
                        {new Date(block.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {block.reason && <span className="text-gray-500 text-sm ml-2">— {block.reason}</span>}
                    </div>
                    <button onClick={() => removeBlockedDate(block.id)} className="text-red-500 text-sm hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar sync */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Calendar sync</h2>

            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-2">Import calendars</h3>
              <p className="text-sm text-gray-500 mb-3">
                Add iCal feed URLs to block your availability. For Google Calendar: Settings &gt; [calendar name] &gt; Integrate calendar &gt; "Secret address in iCal format" (the URL ending in .ics).
              </p>

              {icalImports.length > 0 && (
                <div className="space-y-2 mb-4">
                  {icalImports.map((imp) => (
                    <div key={imp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm">{imp.label}</span>
                        <span className="text-gray-400 text-xs ml-2 truncate block sm:inline">{imp.url.length > 50 ? imp.url.slice(0, 50) + '...' : imp.url}</span>
                      </div>
                      <button onClick={() => removeIcalImport(imp.id)} className="text-red-500 text-sm hover:text-red-600 ml-2 shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {icalImports.length === 0 && (
                <p className="text-sm text-gray-400 mb-4">No calendars added yet.</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={importForm.label} onChange={(e) => { setImportForm({ ...importForm, label: e.target.value }); setImportError(null) }}
                  placeholder="Label (e.g. Personal, Rover)"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-40 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                <input type="url" value={importForm.url} onChange={(e) => { setImportForm({ ...importForm, url: e.target.value }); setImportError(null) }}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                <button onClick={addIcalImport} disabled={importValidating} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {importValidating ? 'Validating...' : 'Add'}
                </button>
              </div>
              {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-2">Export your bookings</h3>
              <p className="text-sm text-gray-500 mb-3">
                Subscribe to this feed to see bookings in your calendar.
              </p>
              <div className="flex gap-2">
                <input type="text" value={feedUrl} readOnly className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <button onClick={handleCopy} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button onClick={handleRegenerateToken} className="text-sm text-red-500 hover:text-red-700 mt-2">
                Regenerate URL
              </button>
            </div>
          </div>
        </>
      )}

      {/* Become a Walker CTA */}
      {!isWalker && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Want to offer dog walking services?</h2>
          <p className="text-sm text-gray-600 mb-4">Create a walker page and start accepting bookings.</p>
          <button
            onClick={handleBecomeWalker}
            disabled={creatingWalker}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {creatingWalker ? 'Creating…' : 'Become a Walker'}
          </button>
        </div>
      )}
    </div>
  )
}
