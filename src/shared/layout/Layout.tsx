import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import AppHeader from '@/shared/AppHeader'
import Avatar from '@/shared/Avatar'

export default function Layout({ walker }: { walker?: string | null } = {}) {
  const { user, profile } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader
        right={
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <Link to="/account" className="block rounded-full hover:ring-2 hover:ring-indigo-200 transition">
                <Avatar src={profile?.avatar_url} name={profile?.name || user.email} size="xs" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 px-3 py-2 sm:py-1.5 text-base sm:text-sm">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-indigo-700 text-base sm:text-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        }
      />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t py-6 text-center text-sm text-gray-400">
        © 2026 One Stop Dog Shop
      </footer>
    </div>
  )
}
