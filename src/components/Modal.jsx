import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex lg:items-center lg:justify-center lg:p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 hidden lg:block"
        onClick={onClose}
      />
      <div className="relative bg-white w-full h-full lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-lg lg:rounded-xl lg:shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 -m-2 text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-gray-200 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  )
}
