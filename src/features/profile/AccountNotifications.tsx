import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useUserProfile, useUpdateUserProfile } from '@/queries/profile'
import { usePushSubscription } from '@/auth/usePushSubscription'

const PREF_ITEMS = [
  { label: 'New chat message', emailKey: 'email_chat_message', pushKey: 'push_chat_message' },
  { label: 'New booking request', emailKey: 'email_new_request', pushKey: 'push_new_request' },
  { label: 'Booking approved / declined', emailKey: 'email_approval', pushKey: 'push_approval' },
  { label: 'Cancellation', emailKey: 'email_cancellation', pushKey: 'push_cancellation' },
  { label: 'Reminders', emailKey: 'email_reminders', pushKey: 'push_reminders' },
]

const DEFAULT_PREFS = {
  email_chat_message: false,
  email_new_request: true,
  email_approval: true,
  email_cancellation: true,
  email_reminders: true,
  push_chat_message: true,
  push_new_request: true,
  push_approval: true,
  push_cancellation: true,
  push_reminders: false,
}

export default function AccountNotifications() {
  const { user } = useAuth()
  const profileQuery = useUserProfile(user?.id)
  const updateProfile = useUpdateUserProfile(user?.id)
  const {
    subscription: pushSub,
    supported: pushSupported,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushSubscription()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const hasInteracted = useRef(false)

  useEffect(() => {
    if (hasInteracted.current) return
    const serverPrefs = profileQuery.data?.notification_preferences as Record<string, boolean> | null | undefined
    if (serverPrefs) setPrefs({ ...DEFAULT_PREFS, ...serverPrefs })
  }, [profileQuery.data?.notification_preferences])

  async function togglePref(key) {
    if (!user) return
    hasInteracted.current = true
    const isPushKey = key.startsWith('push_')
    const turningOn = !prefs[key]
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    if (isPushKey && turningOn && !pushSub && pushSupported) {
      subscribePush()
    }
    try {
      await updateProfile.mutateAsync({ notification_preferences: updated })
    } catch (err) {
      console.error('Failed to save notification prefs:', err)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Notifications</h2>

      {pushSupported && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Push notifications</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pushPermission === 'denied'
                ? 'Blocked by your browser. Enable in your browser settings.'
                : pushSub
                  ? 'Enabled on this device'
                  : pushPermission === 'granted'
                    ? 'Permission granted but not subscribed. Click Enable to finish setup.'
                    : 'Not enabled on this device'}
            </p>
          </div>
          {pushPermission !== 'denied' && (
            pushSub ? (
              <button onClick={unsubscribePush} className="cursor-pointer text-sm text-red-500 hover:text-red-700 font-medium">
                Disable
              </button>
            ) : (
              <button onClick={subscribePush} className="cursor-pointer bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">
                Enable
              </button>
            )
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {PREF_ITEMS.map((item) => (
          <div key={item.emailKey} className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!!prefs[item.emailKey]}
                  onChange={() => togglePref(item.emailKey)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!!prefs[item.pushKey]}
                  onChange={() => togglePref(item.pushKey)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Push
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
