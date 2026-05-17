import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, matchPath } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { getUnreadCounts } from '../../lib/messaging'
import { getUnreadPaymentIds } from '../../lib/payments'
import { walkerTakeFromPayment } from '../../lib/utils'
import InstallPrompt from '../../components/InstallPrompt'
import Sidebar from '../../components/account/Sidebar'
import BottomBar from '../../components/account/BottomBar'
import MoreDrawer from '../../components/account/MoreDrawer'
import PaidCelebrationModal from '../../components/account/PaidCelebrationModal'

export default function AccountLayout() {
  const { user, walkerProfile } = useAuth()
  const location = useLocation()
  const isConversation = !!matchPath('/account/messages/:conversationId', location.pathname)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadPayments, setUnreadPayments] = useState(() => new Set())
  const [moreOpen, setMoreOpen] = useState(false)
  const [installPromptVisible, setInstallPromptVisible] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [paidCelebration, setPaidCelebration] = useState(null)
  const seenPaidIds = useRef(new Set())

  async function refreshUnread() {
    if (!user) return
    const counts = await getUnreadCounts(user.id)
    let total = 0
    for (const n of counts.values()) total += n
    setUnreadCount(total)
  }

  async function refreshUnreadPayments() {
    if (!user) return
    setUnreadPayments(await getUnreadPaymentIds(user.id))
  }

  useEffect(() => {
    if (!user) return
    refreshUnread()
    refreshUnreadPayments()
    if (walkerProfile?.id) {
      supabase
        .from('payments')
        .select('id')
        .eq('walker_id', walkerProfile.id)
        .eq('status', 'paid')
        .then(({ data }) => {
          for (const p of data || []) seenPaidIds.current.add(p.id)
        })
    }
    window.addEventListener('notifications-read', refreshUnread)
    window.addEventListener('payments-read', refreshUnreadPayments)

    const messagesChannel = supabase
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

    const paymentsChannel = supabase
      .channel(`payments-for-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        async (payload) => {
          refreshUnreadPayments()
          window.dispatchEvent(new Event('account-data-mutated'))

          const row = payload.new
          if (
            walkerProfile?.id &&
            row?.walker_id === walkerProfile.id &&
            row?.status === 'paid' &&
            !seenPaidIds.current.has(row.id)
          ) {
            seenPaidIds.current.add(row.id)
            const { data } = await supabase
              .from('payments')
              .select('id, total_cents, platform_fee_cents, refunded_amount_cents, users!payments_client_id_fkey(name)')
              .eq('id', row.id)
              .maybeSingle()
            setPaidCelebration({
              amountCents: walkerTakeFromPayment(data || row),
              counterpart: data?.users?.name || null,
            })
          }
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('notifications-read', refreshUnread)
      window.removeEventListener('payments-read', refreshUnreadPayments)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [user?.id, walkerProfile?.id])

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
      <Sidebar unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.size} />
      <BottomBar onMore={() => setMoreOpen(true)} unreadCount={unreadCount} unreadPaymentsCount={unreadPayments.size} />
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
        open={!!paidCelebration}
        onClose={() => setPaidCelebration(null)}
        amountCents={paidCelebration?.amountCents}
        counterpart={paidCelebration?.counterpart}
      />
    </div>
  )
}
