import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NAV_ITEMS, filterForRole } from './nav'

export default function Sidebar({ unreadCount = 0 }) {
  const { user, profile, walkerProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isWalker = !!walkerProfile

  const items = filterForRole(NAV_ITEMS, isWalker)
  const topLevel = items.filter((i) => !i.parent)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
      <div className="px-4 py-4 border-b border-gray-200">
        <ProfileChip user={user} profile={profile} onSignOut={handleSignOut} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {topLevel.map((item) => {
          const children = items.filter((i) => i.parent === item.key)
          const isParentActive = location.pathname.startsWith(item.to)
          return (
            <div key={item.key}>
              <SidebarRow item={item} badge={item.key === 'messages' ? unreadCount : 0} forceActive={children.length > 0 && isParentActive} />
              {children.length > 0 && isParentActive && (
                <div className="ml-9 mt-1 space-y-0.5">
                  {children.map((child) => (
                    <SidebarChildRow key={child.key} item={child} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

function SidebarRow({ item, badge = 0, forceActive = false }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/account/bookings'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition ${
          isActive || forceActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon size={22} strokeWidth={2} />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function SidebarChildRow({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
          isActive ? 'text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-800'
        }`
      }
    >
      <Icon size={16} strokeWidth={2} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function ProfileChip({ user, profile, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const initial = (profile?.name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()
  const displayName = profile?.name || user?.email || ''

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-1 -m-1 rounded-lg hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          {profile?.name && user?.email && (
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          <Link
            to="/account/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Profile
          </Link>
          <button
            onClick={onSignOut}
            className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
