import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

export default function AccountMessages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadNotifications()
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
    if (notification.link) navigate(notification.link, { state: { from: '/account/messages' } })
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    window.dispatchEvent(new Event('notifications-read'))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl">Inbox</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Mark all read
          </button>
        )}
      </div>

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
              className={`cursor-pointer w-full text-left bg-white border rounded-lg p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                n.read ? 'border-gray-200' : 'border-indigo-300 bg-indigo-50'
              }`}
            >
              <span
                aria-hidden
                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.read ? 'invisible' : 'bg-indigo-600'}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{timeAgo(n.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
