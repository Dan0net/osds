import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Spinner } from '@/shared/Spinner'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
