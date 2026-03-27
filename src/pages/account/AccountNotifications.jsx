import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { usePushSubscription } from '../../hooks/usePushSubscription'

export default function AccountNotifications() {
  const { user } = useAuth()
  const { subscription: pushSub, supported: pushSupported, permission: pushPermission, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushSubscription()

  const [notifications, setNotifications] = useState({
    email_new_request: true,
    email_approval: true,
    email_cancellation: true,
    email_reminders: true,
    push_new_request: true,
    push_approval: true,
    push_cancellation: true,
    push_reminders: false,
  })

  useEffect(() => {
    if (!user) return
    supabase.from('users').select('notification_preferences').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.notification_preferences) setNotifications(data.notification_preferences)
      })
  }, [user?.id])

  function toggleNotification(key) {
    const isPushKey = key.startsWith('push_')
    const turningOn = !notifications[key]

    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      if (user) {
        supabase.from('users').update({ notification_preferences: updated }).eq('id', user.id)
      }
      return updated
    })

    if (isPushKey && turningOn && !pushSub && pushSupported) {
      subscribePush()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

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
              <button onClick={unsubscribePush} className="text-sm text-red-500 hover:text-red-700 font-medium">Disable</button>
            ) : (
              <button onClick={subscribePush} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Enable</button>
            )
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {[
          { label: 'New booking request', emailKey: 'email_new_request', pushKey: 'push_new_request' },
          { label: 'Booking approved / declined', emailKey: 'email_approval', pushKey: 'push_approval' },
          { label: 'Cancellation', emailKey: 'email_cancellation', pushKey: 'push_cancellation' },
          { label: 'Reminders', emailKey: 'email_reminders', pushKey: 'push_reminders' },
        ].map((item) => (
          <div key={item.emailKey} className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={notifications[item.emailKey]}
                  onChange={() => toggleNotification(item.emailKey)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={notifications[item.pushKey]}
                  onChange={() => toggleNotification(item.pushKey)}
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
