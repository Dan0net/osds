import { Outlet } from 'react-router-dom'

export default function AccountSettingsLayout() {
  return (
    <div>
      <h1 className="text-2xl mb-6">Settings</h1>
      <Outlet />
    </div>
  )
}
