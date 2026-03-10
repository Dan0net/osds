import { useState } from 'react'
import { MOCK_USER, MOCK_SERVICES, MOCK_AVAILABILITY, MOCK_BLOCKED_DATES } from '../../lib/mockData'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AccountSettings() {
  // Services
  const [services, setServices] = useState(MOCK_SERVICES)
  const [editingSvc, setEditingSvc] = useState(null)
  const [svcForm, setSvcForm] = useState({ name: '', price_cents: '', duration_minutes: '' })

  // Availability
  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => {
      const existing = MOCK_AVAILABILITY.find((a) => a.day_of_week === i + 1)
      return {
        day, day_of_week: i + 1, enabled: !!existing,
        start_time: existing?.start_time || '09:00',
        end_time: existing?.end_time || '17:00',
      }
    }),
  )
  const [blockedDates, setBlockedDates] = useState(MOCK_BLOCKED_DATES)
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })

  // Calendar
  const [icalUrl, setIcalUrl] = useState('')
  const [icalSaved, setIcalSaved] = useState(false)
  const feedUrl = 'https://onestopdog.shop/cal/walker-1/mock-token-123.ics'
  const [copied, setCopied] = useState(false)

  // --- Services ---
  function startAddSvc() {
    setEditingSvc('new')
    setSvcForm({ name: '', price_cents: '', duration_minutes: '' })
  }
  function startEditSvc(svc) {
    setEditingSvc(svc.id)
    setSvcForm({ name: svc.name, price_cents: String(svc.price_cents / 100), duration_minutes: String(svc.duration_minutes) })
  }
  function saveSvc() {
    const data = {
      name: svcForm.name,
      price_cents: Math.round(parseFloat(svcForm.price_cents) * 100),
      duration_minutes: parseInt(svcForm.duration_minutes),
    }
    if (editingSvc === 'new') {
      setServices((prev) => [...prev, { id: `svc-${Date.now()}`, walker_id: 'walker-1', active: true, ...data }])
    } else {
      setServices((prev) => prev.map((s) => (s.id === editingSvc ? { ...s, ...data } : s)))
    }
    setEditingSvc(null)
  }
  function toggleActive(id) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
  }

  // --- Availability ---
  function toggleDay(dayOfWeek) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a)))
  }
  function updateTime(dayOfWeek, field, value) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a)))
  }
  function addBlockedDate() {
    if (!newBlock.date) return
    setBlockedDates((prev) => [...prev, { ...newBlock }])
    setNewBlock({ date: '', reason: '' })
  }
  function removeBlockedDate(date) {
    setBlockedDates((prev) => prev.filter((b) => b.date !== date))
  }

  // --- Calendar ---
  function handleSaveImport(e) {
    e.preventDefault()
    setIcalSaved(true)
  }
  function handleCopy() {
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Walker settings */}
      {MOCK_USER.has_walker_profile && (
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
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                    <input type="number" step="0.01" value={svcForm.price_cents} onChange={(e) => setSvcForm({ ...svcForm, price_cents: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                    <input type="number" value={svcForm.duration_minutes} onChange={(e) => setSvcForm({ ...svcForm, duration_minutes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={saveSvc} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Save</button>
                  <button onClick={() => setEditingSvc(null)} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {services.map((svc) => (
                <div key={svc.id} className={`bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between ${!svc.active ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-semibold">{svc.name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-indigo-600 font-medium">£{(svc.price_cents / 100).toFixed(2)}</span>
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
                  <div key={block.date} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium text-sm">
                        {new Date(block.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {block.reason && <span className="text-gray-500 text-sm ml-2">— {block.reason}</span>}
                    </div>
                    <button onClick={() => removeBlockedDate(block.date)} className="text-red-500 text-sm hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar sync */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Calendar sync</h2>

            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-2">Import your calendar</h3>
              <p className="text-sm text-gray-500 mb-3">
                Paste your Google/Apple/Outlook iCal URL. Busy times will block your availability.
              </p>
              <form onSubmit={handleSaveImport} className="flex gap-2">
                <input type="url" value={icalUrl} onChange={(e) => { setIcalUrl(e.target.value); setIcalSaved(false) }}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Save</button>
              </form>
              {icalSaved && <p className="text-green-600 text-sm mt-2">Calendar URL saved!</p>}
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
            </div>
          </div>
        </>
      )}

      {/* Become a Walker CTA */}
      {!MOCK_USER.has_walker_profile && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Want to offer dog walking services?</h2>
          <p className="text-sm text-gray-600 mb-4">Create a walker page and start accepting bookings.</p>
          <button className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700">
            Become a Walker
          </button>
        </div>
      )}
    </div>
  )
}
