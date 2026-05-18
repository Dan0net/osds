import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { usePushSubscription } from '@/auth/usePushSubscription'
import { useTotalUnreadConversations } from '@/queries/messages'
import { useUnreadPaymentIds, usePaidCelebration } from '@/queries/payments'
import InstallPrompt from '@/shared/InstallPrompt'
import NotificationPrompt from '@/shared/NotificationPrompt'
import Sidebar from '@/shared/nav/Sidebar'
import BottomBar from '@/shared/nav/BottomBar'
import MoreDrawer from '@/shared/nav/MoreDrawer'
import CelebrationModal from '@/shared/modal/CelebrationModal'
import { formatGBP } from '@/utils/formatting'

export default function AccountLayout() {
  const { user, walkerProfile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [installPromptVisible, setInstallPromptVisible] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [pushPromptVisible, setPushPromptVisible] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const { supported: pushSupported, permission: pushPermission, subscribe: pushSubscribe } = usePushSubscription()

  const unreadConversationsQuery = useTotalUnreadConversations(user?.id)
  const unreadPaymentsQuery = useUnreadPaymentIds(user?.id)
  const { celebration, dismiss: dismissCelebration } = usePaidCelebration(walkerProfile?.id)

  const unreadCount = unreadConversationsQuery.data || 0
  const unreadPayments = unreadPaymentsQuery.data || []

  useEffect(() => {
    if (localStorage.getItem('install-prompt-dismissed')) return

    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isStandalone = (window.navigator as any).standalone === true
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
    const choice = await deferredInstallPrompt.userChoice
    setDeferredInstallPrompt(null)
    window.__deferredInstallPrompt = null
    setInstallPromptVisible(false)
    if (choice?.outcome === 'accepted' && pushSupported && pushPermission === 'default') {
      try { await pushSubscribe() } catch {}
    }
  }

  useEffect(() => {
    if (!pushSupported) return
    if (localStorage.getItem('push-prompt-dismissed')) return
    if (pushPermission !== 'default') { setPushPromptVisible(false); return }
    const isStandalone = (window.navigator as any).standalone === true
      || window.matchMedia?.('(display-mode: standalone)').matches
    if (isStandalone) setPushPromptVisible(true)
  }, [pushSupported, pushPermission])

  function dismissPushPrompt() {
    localStorage.setItem('push-prompt-dismissed', '1')
    setPushPromptVisible(false)
  }

  async function handleEnablePush() {
    setPushBusy(true)
    try { await pushSubscribe() } finally { setPushBusy(false) }
    setPushPromptVisible(false)
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        '--install-prompt-h': (installPromptVisible || pushPromptVisible) ? 'calc(5rem + env(safe-area-inset-bottom))' : '0px',
        '--list-sidebar-w': '21rem',
      } as React.CSSProperties}
    >
      <Sidebar unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.length} />
      <BottomBar onMore={() => setMoreOpen(true)} unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.length} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />

      <main className="lg:ml-56 lg:min-h-screen h-[calc(100dvh_-_56px_-_env(safe-area-inset-bottom)_-_var(--install-prompt-h))] lg:h-auto flex flex-col lg:block lg:pb-[calc(2rem+var(--install-prompt-h))]">
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

      <NotificationPrompt
        visible={pushPromptVisible && !installPromptVisible}
        busy={pushBusy}
        onDismiss={dismissPushPrompt}
        onEnable={handleEnablePush}
      />

      <CelebrationModal
        open={!!celebration}
        onClose={dismissCelebration}
        lottieUrl="https://fonts.gstatic.com/s/e/notoemoji/latest/1f911/lottie.json"
        title="You got paid!"
        subtitle={celebration?.amountCents != null ? `+${formatGBP(celebration.amountCents)}` : undefined}
        footnote={celebration?.counterpart ? `from ${celebration.counterpart}` : undefined}
      />
    </div>
  )
}
