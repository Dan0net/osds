import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NAV_ITEMS, filterForRole } from './nav'
import ProfileChip from './ProfileChip'

export default function MoreDrawer({ open, onClose }) {
  const { walkerProfile } = useAuth()
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

  const items = filterForRole(NAV_ITEMS, isWalker)
  // Top-level items minus the Settings parent (Settings shows as a section heading instead).
  const topLevel = items.filter((i) => !i.parent && i.key !== 'settings')
  const settingsChildren = items.filter((i) => i.parent === 'settings')

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <ProfileChip onItemClick={onClose} />
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer p-2 -m-2 text-gray-500 hover:text-gray-800 shrink-0"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <MenuGrid items={topLevel} onItemClick={onClose} />

        {settingsChildren.length > 0 && (
          <div>
            <h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Settings
            </h3>
            <MenuGrid items={settingsChildren} onItemClick={onClose} />
          </div>
        )}
      </nav>
    </div>
  )
}

function MenuGrid({ items, onItemClick }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onItemClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <Icon size={22} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
