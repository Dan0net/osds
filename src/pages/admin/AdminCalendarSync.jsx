import { useState } from 'react'

export default function AdminCalendarSync() {
  const [icalUrl, setIcalUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const feedUrl = 'https://onestopdog.shop/cal/walker-1/mock-token-123.ics'
  const [copied, setCopied] = useState(false)

  function handleSaveImport(e) {
    e.preventDefault()
    setSaved(true)
  }

  function handleCopy() {
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar Sync</h1>

      {/* Import */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Import your calendar</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste your Google/Apple/Outlook iCal URL. Busy times will automatically
          block your availability.
        </p>
        <form onSubmit={handleSaveImport} className="flex gap-2">
          <input
            type="url"
            value={icalUrl}
            onChange={(e) => { setIcalUrl(e.target.value); setSaved(false) }}
            placeholder="https://calendar.google.com/calendar/ical/..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Save
          </button>
        </form>
        {saved && (
          <p className="text-green-600 text-sm mt-2">
            Calendar URL saved! Your availability will update automatically.
          </p>
        )}
      </div>

      {/* Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Export your bookings</h2>
        <p className="text-sm text-gray-500 mb-4">
          Subscribe to this feed in Google Calendar, Apple Calendar, or Outlook
          to see your bookings automatically.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={feedUrl}
            readOnly
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
          />
          <button
            onClick={handleCopy}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
