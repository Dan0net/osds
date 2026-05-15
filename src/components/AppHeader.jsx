import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AppHeader({ right }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/osds-icon.svg" alt="One Stop Dog Shop" className="h-10 sm:hidden" />
          <img src="/osds-logo.svg" alt="One Stop Dog Shop" className="h-10 hidden sm:block" />
        </Link>
        {right}
      </div>
    </header>
  )
}
