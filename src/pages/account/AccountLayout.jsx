import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { getUnreadCounts } from '../../lib/messaging'
import InstallPrompt from '../../components/InstallPrompt'
import Sidebar from '../../components/account/Sidebar'
import BottomBar from '../../components/account/BottomBar'
import MoreDrawer from '../../components/account/MoreDrawer'

export default function AccountLayout() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [installPromptVisible, setInstallPromptVisible] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)

  async function refreshUnread() {
    if (!user) return
    const counts = await getUnreadCounts(user.id)
    let total = 0
    for (const n of counts.values()) total += n
    setUnreadCount(total)
  }

  useEffect(() => {
    if (!user) return
    refreshUnread()
    window.addEventListener('notifications-read', refreshUnread)

    const channel = supabase
      .channel(`messages-for-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          window.dispatchEvent(new CustomEvent('message-received', { detail: msg }))
          if (msg.sender_user_id !== user.id) refreshUnread()
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('notifications-read', refreshUnread)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    if (localStorage.getItem('install-prompt-dismissed')) return

    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isStandalone = window.navigator.standalone === true
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

    if (isIos && !isStandalone && isSafari) {
      setInstallPromptVisible(true)
      return
    }

    if (window.__deferredInstallPrompt) {
      setDeferredInstallPrompt(window.__deferredInstallPrompt)
      setInstallPromptVisible(true)
      return
    }

    function adopt() {
      if (!window.__deferredInstallPrompt) return
      setDeferredInstallPrompt(window.__deferredInstallPrompt)
      setInstallPromptVisible(true)
    }
    function handlePrompt(e) {
      e.preventDefault()
      window.__deferredInstallPrompt = e
      adopt()
    }
    window.addEventListener('install-prompt-ready', adopt)
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => {
      window.removeEventListener('install-prompt-ready', adopt)
      window.removeEventListener('beforeinstallprompt', handlePrompt)
    }
  }, [])

  function dismissInstallPrompt() {
    localStorage.setItem('install-prompt-dismissed', '1')
    setInstallPromptVisible(false)
  }

  async function handleInstall() {
    if (!deferredInstallPrompt) {
      setInstallPromptVisible(false)
      return
    }
    deferredInstallPrompt.prompt()
    await deferredInstallPrompt.userChoice
    setDeferredInstallPrompt(null)
    window.__deferredInstallPrompt = null
    setInstallPromptVisible(false)
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ '--install-prompt-h': installPromptVisible ? 'calc(5rem + env(safe-area-inset-bottom))' : '0px' }}
    >
      <Sidebar unreadCount={unreadCount} />
      <BottomBar onMore={() => setMoreOpen(true)} unreadCount={unreadCount} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />

      <main className="lg:ml-64 lg:min-h-screen lg:pb-[calc(2rem+var(--install-prompt-h))] h-[calc(100dvh_-_56px_-_env(safe-area-inset-bottom)_-_var(--install-prompt-h))] lg:h-auto flex flex-col lg:block">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 lg:py-5 flex-1 min-h-0 overflow-y-auto lg:flex-none lg:overflow-visible lg:min-h-0">
          <Outlet />
        </div>
      </main>

      <InstallPrompt
        visible={installPromptVisible}
        deferredPrompt={deferredInstallPrompt}
        onDismiss={dismissInstallPrompt}
        onInstall={handleInstall}
      />
    </div>
  )
}
