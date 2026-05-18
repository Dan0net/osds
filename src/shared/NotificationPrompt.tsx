import Button from '@/shared/form/Button'

export default function NotificationPrompt({ visible, onDismiss, onEnable, busy }) {
  if (!visible) return null

  return (
    <div className="fixed left-0 right-0 lg:left-56 bottom-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 h-20">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">Enable push notifications</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">Get notified about new bookings and messages</p>
        </div>
        <Button onClick={onEnable} size="sm" className="shrink-0" disabled={busy}>
          {busy ? 'Enabling…' : 'Enable'}
        </Button>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Dismiss">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
