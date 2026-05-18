import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NAV_ITEMS, BOTTOM_BAR_KEYS } from './nav'

export default function BottomBar({ onMore, unreadCount = 0, unreadPaymentsCount = 0 }) {
  const bottomItems = BOTTOM_BAR_KEYS.map((key) => NAV_ITEMS.find((i) => i.key === key))

  return (
    <nav className="lg:hidden fixed bottom-[var(--install-prompt-h,0px)] left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {bottomItems.map((item) => (
          <BottomTab
            key={item.key}
            item={item}
            badge={
              item.key === 'messages' ? unreadCount
                : item.key === 'money' ? unreadPaymentsCount
                : 0
            }
          />
        ))}
        <button
          onClick={onMore}
          className="cursor-pointer flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-gray-800"
        >
          <Menu size={24} strokeWidth={2} />
          <span className="text-[11px] font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}

function BottomTab({ item, badge = 0 }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/account/bookings'}
      className={({ isActive }) =>
        `relative flex-1 flex flex-col items-center justify-center gap-1 py-2 ${
          isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
        }`
      }
    >
      <Icon size={24} strokeWidth={2} />
      <span className="text-[11px] font-medium">{item.label}</span>
      {badge > 0 && (
        <span className="absolute top-1.5 right-[calc(50%-18px)] inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}
