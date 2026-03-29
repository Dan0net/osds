import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Redirect to Inbox preferences tab — Notifications is now merged into Inbox
export default function AccountNotifications() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/account/inbox?tab=preferences', { replace: true })
  }, [navigate])
  return null
}
