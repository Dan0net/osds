import { useState, useEffect } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useIcalImports, useValidateIcalUrl, useAddIcalImport, useRemoveIcalImport } from '@/queries/ical'
import { useUpdateWalkerProfile } from '@/queries/profile'
import Button from '@/shared/form/Button'
import { TextInput } from '@/shared/form/Input'

export default function AccountCalendarSync() {
  const { walkerProfile } = useAuth()
  const importsQuery = useIcalImports(walkerProfile?.id)
  const validateUrl = useValidateIcalUrl()
  const addImport = useAddIcalImport(walkerProfile?.id)
  const removeImport = useRemoveIcalImport()
  const updateProfile = useUpdateWalkerProfile(walkerProfile?.id)

  const icalImports = importsQuery.data || []
  const [importForm, setImportForm] = useState({ label: '', url: '' })
  const [importError, setImportError] = useState(null)
  const [copied, setCopied] = useState(false)

  const feedUrl = walkerProfile
    ? `https://${import.meta.env.VITE_DOMAIN || 'onestopdog.shop'}/cal/${walkerProfile.id}/${walkerProfile.calendar_feed_token || 'not-set'}.ics`
    : ''

  // Lazily generate a calendar_feed_token on first visit if missing.
  useEffect(() => {
    if (!walkerProfile || walkerProfile.calendar_feed_token) return
    updateProfile.mutate({ calendar_feed_token: crypto.randomUUID() })
  }, [walkerProfile?.id, walkerProfile?.calendar_feed_token])

  async function handleAddIcal() {
    setImportError(null)
    if (!importForm.label.trim() || !importForm.url.trim()) {
      setImportError('Label and URL are required')
      return
    }
    if (!importForm.url.startsWith('https://')) {
      setImportError('URL must start with https://')
      return
    }
    try {
      const res = await validateUrl.mutateAsync(importForm.url.trim())
      if (!res.data?.valid) {
        setImportError(res.data?.error || 'Could not validate URL')
        return
      }
    } catch {
      setImportError('Failed to validate URL')
      return
    }
    try {
      await addImport.mutateAsync({ label: importForm.label.trim(), url: importForm.url.trim() })
      setImportForm({ label: '', url: '' })
    } catch (err) {
      setImportError(err.message)
    }
  }

  async function handleRegenerateToken() {
    if (!confirm('Regenerating will invalidate the current feed URL. Any calendars subscribed to it will stop updating. Continue?')) return
    await updateProfile.mutateAsync({ calendar_feed_token: crypto.randomUUID() })
    window.location.reload()
  }

  function handleCopy() {
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Calendar sync is only available for walkers.</p>
  }

  const validating = validateUrl.isPending || addImport.isPending

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
                <Button onClick={() => removeImport.mutate(imp.id)} variant="destructive-text" className="ml-2 shrink-0">
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {icalImports.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No calendars added yet.</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <TextInput
            type="text"
            value={importForm.label}
            onChange={(e) => { setImportForm({ ...importForm, label: e.target.value }); setImportError(null) }}
            placeholder="Label (e.g. Personal, Rover)"
            className="text-sm sm:w-40"
          />
          <TextInput
            type="url"
            value={importForm.url}
            onChange={(e) => { setImportForm({ ...importForm, url: e.target.value }); setImportError(null) }}
            placeholder="https://calendar.google.com/calendar/ical/..."
            className="text-sm flex-1"
          />
          <Button onClick={handleAddIcal} disabled={validating} size="sm">
            {validating ? 'Validating...' : 'Add'}
          </Button>
        </div>
        {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-2">Export your bookings</h3>
        <p className="text-sm text-gray-500 mb-3">Subscribe to this feed to see bookings in your calendar.</p>
        <div className="flex gap-2">
          <TextInput type="text" value={feedUrl} readOnly className="flex-1 text-sm bg-gray-50" />
          <Button onClick={handleCopy} variant="secondary" size="sm">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <Button onClick={handleRegenerateToken} variant="destructive-text" className="mt-2">
          Regenerate URL
        </Button>
      </div>
    </div>
  )
}
