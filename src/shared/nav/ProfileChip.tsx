import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'

export default function ProfileChip({ onItemClick }: { onItemClick?: () => void } = {}) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
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

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    onItemClick?.()
    navigate('/')
  }

  function handleProfileClick() {
    setOpen(false)
    onItemClick?.()
  }

  const initial = (profile?.name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()
  const displayName = profile?.name || user?.email || ''

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer w-full flex items-center gap-3 p-1 -m-1 rounded-lg hover:bg-gray-50 transition"
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
        <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          <Link
            to="/account/profile"
            onClick={handleProfileClick}
            className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Profile
          </Link>
          <button
            onClick={handleSignOut}
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
