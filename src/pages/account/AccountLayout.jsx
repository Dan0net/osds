import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import InstallPrompt from '../../components/InstallPrompt'
import Sidebar from '../../components/account/Sidebar'
import BottomBar from '../../components/account/BottomBar'
import MoreDrawer from '../../components/account/MoreDrawer'

export default function AccountLayout() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)

  function refreshUnread() {
    if (!user) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count || 0))
  }

  useEffect(() => {
    refreshUnread()
    window.addEventListener('notifications-read', refreshUnread)
    return () => window.removeEventListener('notifications-read', refreshUnread)
  }, [user?.id])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar unreadCount={unreadCount} />
      <BottomBar onMore={() => setMoreOpen(true)} unreadCount={unreadCount} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />

      <main className="lg:ml-64 lg:pb-8 lg:min-h-screen h-[calc(100dvh_-_56px_-_env(safe-area-inset-bottom))] lg:h-auto flex flex-col lg:block">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 lg:py-6 flex-1 min-h-0 overflow-y-auto lg:flex-none lg:overflow-visible lg:min-h-0">
          <Outlet />
        </div>
      </main>

      <InstallPrompt />
    </div>
  )
}
