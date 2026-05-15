import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AccountAvailability() {
  const { walkerProfile } = useAuth()

  const [availability, setAvailability] = useState(
    DAYS.map((day, i) => ({
      day, day_of_week: i + 1, enabled: false,
      start_time: '09:00', end_time: '17:00',
    })),
  )
  const [availSaving, setAvailSaving] = useState(false)
  const [blockedDates, setBlockedDates] = useState([])
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })

  useEffect(() => {
    if (!walkerProfile) return
    loadAvailability()
    loadBlockedDates()
  }, [walkerProfile?.id])

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

  function toggleDay(dayOfWeek) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a)))
  }
  function updateTime(dayOfWeek, field, value) {
    setAvailability((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a)))
  }
  async function saveAvailability() {
    setAvailSaving(true)
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

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Weekly hours</h3>
        <div className="space-y-3">
          {availability.map((slot) => (
            <div key={slot.day_of_week} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={() => toggleDay(slot.day_of_week)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-sm ${slot.enabled ? 'font-medium' : 'text-gray-400'}`}>{slot.day}</span>
              </label>
              {slot.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateTime(slot.day_of_week, 'start_time', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateTime(slot.day_of_week, 'end_time', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={saveAvailability}
          disabled={availSaving}
          className="mt-3 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {availSaving ? 'Saving...' : 'Save schedule'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Blocked dates</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
            <div key={block.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <span className="font-medium text-sm">
                  {new Date(block.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {block.reason && <span className="text-gray-500 text-sm ml-2">— {block.reason}</span>}
              </div>
              <button onClick={() => removeBlockedDate(block.id)} className="text-red-500 text-sm hover:text-red-600">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
