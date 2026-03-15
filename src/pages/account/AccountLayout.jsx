import { NavLink, Outlet } from 'react-router-dom'
import { MOCK_USER } from '../../lib/mockData'

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
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-indigo-600">
            One Stop Dog Shop
          </NavLink>
          <span className="text-sm text-gray-500">{MOCK_USER.name}</span>
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
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
