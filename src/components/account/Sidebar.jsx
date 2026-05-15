import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NAV_ITEMS, filterForRole } from './nav'
import ProfileChip from './ProfileChip'

export default function Sidebar({ unreadCount = 0 }) {
  const { walkerProfile } = useAuth()
  const location = useLocation()
  const isWalker = !!walkerProfile

  const items = filterForRole(NAV_ITEMS, isWalker)
  const topLevel = items.filter((i) => !i.parent)

  // Track which parent groups are expanded. Default-open whichever is active.
  const [expanded, setExpanded] = useState(() => {
    const initial = {}
    for (const item of topLevel) {
      if (location.pathname.startsWith(item.to + '/')) initial[item.key] = true
    }
    return initial
  })

  function toggleExpanded(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
      <div className="px-4 py-4 border-b border-gray-200">
        <ProfileChip />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {topLevel.map((item) => {
          const children = items.filter((i) => i.parent === item.key)
          const hasChildren = children.length > 0
          const isOpen = !!expanded[item.key]
          return (
            <div key={item.key}>
              {hasChildren ? (
                <ParentToggleRow
                  item={item}
                  expanded={isOpen}
                  onToggle={() => toggleExpanded(item.key)}
                />
              ) : (
                <SidebarRow item={item} badge={item.key === 'messages' ? unreadCount : 0} />
              )}
              {hasChildren && isOpen && (
                <div className="mt-1 space-y-1">
                  {children.map((child) => (
                    <SidebarRow key={child.key} item={child} isChild />
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

function SidebarRow({ item, badge = 0, isChild = false }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/account/bookings'}
      className={({ isActive }) =>
        `flex items-center gap-3 ${isChild ? 'pl-10 pr-3' : 'px-3'} py-2.5 rounded-lg font-medium text-sm transition ${
          isActive
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

function ParentToggleRow({ item, expanded, onToggle }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    >
      <Icon size={22} strokeWidth={2} />
      <span className="flex-1 text-left">{item.label}</span>
      <ChevronDown size={18} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
  )
}
