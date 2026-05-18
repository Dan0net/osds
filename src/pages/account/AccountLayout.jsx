import { useState, useEffect } from 'react'
import { Outlet, useLocation, matchPath } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTotalUnreadConversations } from '../../lib/queries/messages'
import { useUnreadPaymentIds, usePaidCelebration } from '../../lib/queries/payments'
import InstallPrompt from '../../components/InstallPrompt'
import Sidebar from '../../components/account/Sidebar'
import BottomBar from '../../components/account/BottomBar'
import MoreDrawer from '../../components/account/MoreDrawer'
import PaidCelebrationModal from '../../components/account/PaidCelebrationModal'

export default function AccountLayout() {
  const { user, walkerProfile } = useAuth()
  const location = useLocation()
  const isConversation = !!matchPath('/account/messages/:conversationId', location.pathname)
  const [moreOpen, setMoreOpen] = useState(false)
  const [installPromptVisible, setInstallPromptVisible] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)

  const unreadConversationsQuery = useTotalUnreadConversations(user?.id)
  const unreadPaymentsQuery = useUnreadPaymentIds(user?.id)
  const { celebration, dismiss: dismissCelebration } = usePaidCelebration(walkerProfile?.id)

  const unreadCount = unreadConversationsQuery.data || 0
  const unreadPayments = unreadPaymentsQuery.data || []

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
      style={{
        '--install-prompt-h': installPromptVisible ? 'calc(5rem + env(safe-area-inset-bottom))' : '0px',
        '--list-sidebar-w': '21rem',
      }}
    >
      <Sidebar unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.length} />
      <BottomBar onMore={() => setMoreOpen(true)} unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.length} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />

      <main className={`lg:ml-56 lg:min-h-screen h-[calc(100dvh_-_56px_-_env(safe-area-inset-bottom)_-_var(--install-prompt-h))] lg:h-auto flex flex-col lg:block ${isConversation ? 'lg:pb-[var(--install-prompt-h)]' : 'lg:pb-[calc(2rem+var(--install-prompt-h))]'}`}>
        <div className={`max-w-5xl mx-auto w-full px-4 flex-1 min-h-0 overflow-y-auto lg:flex-none lg:overflow-visible lg:min-h-0 ${isConversation ? '' : 'py-3 lg:py-5'}`}>
          <Outlet />
        </div>
      </main>

      <InstallPrompt
        visible={installPromptVisible}
        deferredPrompt={deferredInstallPrompt}
        onDismiss={dismissInstallPrompt}
        onInstall={handleInstall}
      />

      <PaidCelebrationModal
        open={!!celebration}
        onClose={dismissCelebration}
        amountCents={celebration?.amountCents}
        counterpart={celebration?.counterpart}
      />
    </div>
  )
}
