import { NavLink } from 'react-router-dom'

export default function ListItem({ to, state, end, children }) {
  return (
    <NavLink
      to={to}
      state={state}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
