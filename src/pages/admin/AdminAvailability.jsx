import { useState } from 'react'
import { MOCK_AVAILABILITY, MOCK_BLOCKED_DATES } from '../../lib/mockData'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AdminAvailability() {
  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => {
      const existing = MOCK_AVAILABILITY.find((a) => a.day_of_week === i + 1)
      return {
        day,
        day_of_week: i + 1,
        enabled: !!existing,
        start_time: existing?.start_time || '09:00',
        end_time: existing?.end_time || '17:00',
      }
    }),
  )
  const [blockedDates, setBlockedDates] = useState(MOCK_BLOCKED_DATES)
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })

  function toggleDay(dayOfWeek) {
    setAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a,
      ),
    )
  }

  function updateTime(dayOfWeek, field, value) {
    setAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a,
      ),
    )
  }

  function addBlockedDate() {
    if (!newBlock.date) return
    setBlockedDates((prev) => [...prev, { ...newBlock }])
    setNewBlock({ date: '', reason: '' })
  }

  function removeBlockedDate(date) {
    setBlockedDates((prev) => prev.filter((b) => b.date !== date))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Availability</h1>

      {/* Weekly hours */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-4">Weekly hours</h2>
        <div className="space-y-3">
          {availability.map((slot) => (
            <div
              key={slot.day_of_week}
              className="flex items-center gap-3"
            >
              <label className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={() => toggleDay(slot.day_of_week)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-sm ${slot.enabled ? 'font-medium' : 'text-gray-400'}`}>
                  {slot.day}
                </span>
              </label>
              {slot.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) =>
                      updateTime(slot.day_of_week, 'start_time', e.target.value)
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) =>
                      updateTime(slot.day_of_week, 'end_time', e.target.value)
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blocked dates */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold mb-4">Blocked dates</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={newBlock.date}
            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
            placeholder="Reason (optional)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={addBlockedDate}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Block
          </button>
        </div>
        <div className="space-y-2">
          {blockedDates.map((block) => (
            <div
              key={block.date}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <div>
                <span className="font-medium text-sm">
                  {new Date(block.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {block.reason && (
                  <span className="text-gray-500 text-sm ml-2">— {block.reason}</span>
                )}
              </div>
              <button
                onClick={() => removeBlockedDate(block.date)}
                className="text-red-500 text-sm hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
