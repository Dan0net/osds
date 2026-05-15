import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function AccountSettingsLayout() {
  const { walkerProfile } = useAuth()
  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Settings are only available for walkers.</p>
  }

  return (
    <div>
      <h1 className="text-2xl mb-6">Settings</h1>
      <Outlet />
    </div>
  )
}
