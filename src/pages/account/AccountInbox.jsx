import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { usePushSubscription } from '../../hooks/usePushSubscription'

export default function AccountInbox() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('inbox')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Preferences state
  const { subscription: pushSub, supported: pushSupported, permission: pushPermission, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushSubscription()
  const [prefs, setPrefs] = useState({
    email_new_request: true, email_approval: true, email_cancellation: true, email_reminders: true,
    push_new_request: true, push_approval: true, push_cancellation: true, push_reminders: false,
  })

  useEffect(() => {
    if (user) {
      loadNotifications()
      supabase.from('users').select('notification_preferences').eq('id', user.id).single()
        .then(({ data }) => { if (data?.notification_preferences) setPrefs(data.notification_preferences) })
    }
  }, [user?.id])

  async function loadNotifications() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  async function markAsRead(notification) {
    if (!notification.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notification.id)
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read: true } : n))
      window.dispatchEvent(new Event('notifications-read'))
    }
    if (notification.link) navigate(notification.link)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    window.dispatchEvent(new Event('notifications-read'))
  }

  function togglePref(key) {
    const isPushKey = key.startsWith('push_')
    const turningOn = !prefs[key]
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      if (user) supabase.from('users').update({ notification_preferences: updated }).eq('id', user.id)
      return updated
    })
    if (isPushKey && turningOn && !pushSub && pushSupported) subscribePush()
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inbox</h1>
        {tab === 'inbox' && unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setTab('inbox')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'inbox' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Notifications
        </button>
        <button
          onClick={() => setTab('preferences')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'preferences' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Preferences
        </button>
      </div>

      {tab === 'inbox' ? (
        <>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n)}
                  className={`w-full text-left bg-white border rounded-lg p-4 flex items-start justify-between hover:bg-gray-50 transition-colors ${
                    n.read ? 'border-gray-200' : 'border-indigo-300 bg-indigo-50'
                  }`}
                >
                  <div>
                    {!n.read && <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full mr-2 mt-1" />}
                    <span className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>{n.title}</span>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 ml-4">{n.body}</p>}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{timeAgo(n.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
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
                    <input type="checkbox" checked={prefs[item.emailKey]} onChange={() => togglePref(item.emailKey)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    Email
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <input type="checkbox" checked={prefs[item.pushKey]} onChange={() => togglePref(item.pushKey)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    Push
                  </label>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
