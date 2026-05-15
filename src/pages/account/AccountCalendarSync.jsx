import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'

export default function AccountCalendarSync() {
  const { walkerProfile } = useAuth()

  const [icalImports, setIcalImports] = useState([])
  const [importForm, setImportForm] = useState({ label: '', url: '' })
  const [importError, setImportError] = useState(null)
  const [importValidating, setImportValidating] = useState(false)
  const [copied, setCopied] = useState(false)

  const feedUrl = walkerProfile
    ? `https://${import.meta.env.VITE_DOMAIN || 'onestopdog.shop'}/cal/${walkerProfile.id}/${walkerProfile.calendar_feed_token || 'not-set'}.ics`
    : ''

  useEffect(() => {
    if (!walkerProfile) return
    loadIcalImports()
    if (!walkerProfile.calendar_feed_token) {
      const token = crypto.randomUUID()
      supabase
        .from('walker_profiles')
        .update({ calendar_feed_token: token })
        .eq('id', walkerProfile.id)
    }
  }, [walkerProfile?.id])

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
    await supabase
      .from('walker_profiles')
      .update({ calendar_feed_token: newToken })
      .eq('id', walkerProfile.id)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                  <span className="text-gray-400 text-xs ml-2 truncate block sm:inline">
                    {imp.url.length > 50 ? imp.url.slice(0, 50) + '...' : imp.url}
                  </span>
                </div>
                <button onClick={() => removeIcalImport(imp.id)} className="text-red-500 text-sm hover:text-red-600 ml-2 shrink-0">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {icalImports.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No calendars added yet.</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={importForm.label}
            onChange={(e) => { setImportForm({ ...importForm, label: e.target.value }); setImportError(null) }}
            placeholder="Label (e.g. Personal, Rover)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-40 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="url"
            value={importForm.url}
            onChange={(e) => { setImportForm({ ...importForm, url: e.target.value }); setImportError(null) }}
            placeholder="https://calendar.google.com/calendar/ical/..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button
            onClick={addIcalImport}
            disabled={importValidating}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {importValidating ? 'Validating...' : 'Add'}
          </button>
        </div>
        {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-2">Export your bookings</h3>
        <p className="text-sm text-gray-500 mb-3">Subscribe to this feed to see bookings in your calendar.</p>
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
  )
}
