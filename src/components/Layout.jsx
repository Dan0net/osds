import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ walker }) {
  const { user, profile } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/osds-logo.svg" alt="One Stop Dog Shop" className="h-10" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <Link to="/account" className="text-gray-600 hover:text-indigo-600">
                {profile?.name || user.email}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-indigo-600">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t py-6 text-center text-sm text-gray-400">
        © 2026 One Stop Dog Shop
      </footer>
    </div>
  )
}
