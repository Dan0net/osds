import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NAV_ITEMS, BOTTOM_BAR_KEYS, filterForRole } from './nav'

export default function MoreDrawer({ open, onClose }) {
  const { user, profile, walkerProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const isWalker = !!walkerProfile

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  // Items that aren't in the bottom bar and aren't sub-children
  const items = filterForRole(NAV_ITEMS, isWalker).filter(
    (i) => !BOTTOM_BAR_KEYS.includes(i.key) && !i.parent,
  )

  async function handleSignOut() {
    await signOut()
    onClose()
    navigate('/')
  }

  const initial = (profile?.name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()
  const displayName = profile?.name || user?.email || ''

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            {profile?.name && user?.email && (
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer p-2 -m-2 text-gray-500 hover:text-gray-800"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              <Icon size={24} strokeWidth={2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="cursor-pointer w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          <LogOut size={22} />
          Log out
        </button>
      </div>
    </div>
  )
}
