import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import InstallPrompt from '../../components/InstallPrompt'

const NAV_ITEMS = [
  { to: '/account', label: 'Dashboard', end: true },
  { to: '/account/bookings', label: 'Bookings' },
  { to: '/account/pets', label: 'Pets' },
  { to: '/account/payments', label: 'Payments' },
  { to: '/account/inbox', label: 'Inbox' },
  { to: '/account/profile', label: 'Profile' },
  { to: '/account/settings', label: 'Settings' },
]

export default function AccountLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

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

    // Listen for reads from Inbox
    window.addEventListener('notifications-read', refreshUnread)
    return () => window.removeEventListener('notifications-read', refreshUnread)
  }, [user?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-indigo-600">
            One Stop Dog Shop
          </NavLink>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{profile?.name || 'Account'}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-4 sm:flex sm:gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-1 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 text-center ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {item.label}
              {item.label === 'Inbox' && unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <InstallPrompt />
    </div>
  )
}
