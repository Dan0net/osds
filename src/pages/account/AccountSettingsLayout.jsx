import { Outlet, NavLink } from 'react-router-dom'
import { Clock, Repeat } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const SUB_NAV = [
  { to: '/account/settings/availability', label: 'Availability', icon: Clock },
  { to: '/account/settings/calendar-sync', label: 'Calendar sync', icon: Repeat },
]

export default function AccountSettingsLayout() {
  const { walkerProfile } = useAuth()
  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Settings are only available for walkers.</p>
  }

  return (
    <div>
      <h1 className="text-2xl mb-4">Settings</h1>

      <div className="flex gap-2 mb-6 lg:hidden">
        {SUB_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-white border border-gray-200 text-gray-600'
                }`
              }
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
