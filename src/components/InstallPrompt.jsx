export default function InstallPrompt({ visible, deferredPrompt, onDismiss, onInstall }) {
  if (!visible) return null

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed left-0 right-0 lg:left-56 bottom-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 h-20">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">Get push notifications</p>
          {isIos ? (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Tap <span className="inline-block align-middle">
                <svg className="w-4 h-4 inline text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </span> Share → "Add to Home Screen"
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5 truncate">Install the app for the best experience</p>
          )}
        </div>
        {!isIos && deferredPrompt && (
          <button onClick={onInstall} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 shrink-0">
            Install
          </button>
        )}
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Dismiss">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
