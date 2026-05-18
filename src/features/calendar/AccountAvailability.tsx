import { useState, useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import {
  useAvailability, useBlockedDates,
  useReplaceAvailability, useAddBlockedDate, useRemoveBlockedDate,
} from '@/queries/availability'
import Button from '@/shared/form/Button'
import { TextInput } from '@/shared/form/Input'
import { formatLongDate } from '@/utils/formatting'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function buildSlots(serverRows) {
  return DAYS.map((day, i) => {
    const existing = (serverRows || []).find((a) => a.day_of_week === i + 1)
    return {
      id: existing?.id,
      day,
      day_of_week: i + 1,
      enabled: !!existing,
      start_time: existing?.start_time?.slice(0, 5) || '09:00',
      end_time: existing?.end_time?.slice(0, 5) || '17:00',
    }
  })
}

export default function AccountAvailability() {
  const { walkerProfile } = useAuth()
  const availabilityQuery = useAvailability(walkerProfile?.id)
  const blockedQuery = useBlockedDates(walkerProfile?.id)
  const replaceAvailability = useReplaceAvailability(walkerProfile?.id)
  const addBlocked = useAddBlockedDate(walkerProfile?.id)
  const removeBlocked = useRemoveBlockedDate()

  const serverSlots = useMemo(() => buildSlots(availabilityQuery.data), [availabilityQuery.data])
  const [slots, setSlots] = useState(serverSlots)
  const [hasEditedSchedule, setHasEditedSchedule] = useState(false)

  // Sync server state into local state when the query data changes, but only
  // if the user hasn't started editing — otherwise we'd clobber unsaved changes.
  useMemo(() => {
    if (!hasEditedSchedule) setSlots(serverSlots)
  }, [serverSlots, hasEditedSchedule])

  const blockedDates = blockedQuery.data || []
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })

  function toggleDay(dayOfWeek) {
    setHasEditedSchedule(true)
    setSlots((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, enabled: !a.enabled } : a)))
  }
  function updateTime(dayOfWeek, field, value) {
    setHasEditedSchedule(true)
    setSlots((prev) => prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a)))
  }

  async function saveAvailability() {
    const enabled = slots.filter((s) => s.enabled)
    await replaceAvailability.mutateAsync(enabled)
    setHasEditedSchedule(false)
  }

  async function addBlockedDate() {
    if (!newBlock.date) return
    await addBlocked.mutateAsync(newBlock)
    setNewBlock({ date: '', reason: '' })
  }

  async function removeBlockedDate(id) {
    await removeBlocked.mutateAsync(id)
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Availability is only available for walkers.</p>
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Weekly hours</h3>
        <div className="space-y-3">
          {slots.map((slot) => (
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
        <Button onClick={saveAvailability} disabled={replaceAvailability.isPending} size="sm" className="mt-3">
          {replaceAvailability.isPending ? 'Saving...' : 'Save schedule'}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-3">Blocked dates</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <TextInput
            type="date"
            value={newBlock.date}
            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            className="text-sm sm:w-auto"
          />
          <TextInput
            type="text"
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
            placeholder="Reason (optional)"
            className="text-sm flex-1"
          />
          <Button onClick={addBlockedDate} disabled={addBlocked.isPending} size="sm">
            Block
          </Button>
        </div>
        <div className="space-y-2">
          {blockedDates.map((block) => (
            <div key={block.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <span className="font-medium text-sm">{formatLongDate(block.date)}</span>
                {block.reason && <span className="text-gray-500 text-sm ml-2">— {block.reason}</span>}
              </div>
              <Button onClick={() => removeBlockedDate(block.id)} variant="destructive-text">Remove</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
