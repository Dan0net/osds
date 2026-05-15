import { useEffect, useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'

const ANIM_MS = 220

export default function Modal({
  open,
  onClose,
  onBack,
  title,
  children,
  footer,
  formId,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
  saveLoading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      setVisible(false)
      const id = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(id)
    }
  }, [open])

  useEffect(() => {
    if (!mounted || !open) return
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [mounted, open])

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

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex lg:items-center lg:justify-center lg:p-4" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-black/40 hidden lg:block transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-full h-full lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-lg lg:rounded-xl lg:shadow-xl flex flex-col transition-[transform,opacity] duration-200 ease-out ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full lg:translate-y-0 lg:opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0 gap-2">
          <button
            onClick={onBack || onClose}
            className="cursor-pointer p-2 -m-1 text-gray-500 hover:text-gray-800 shrink-0"
            aria-label={onBack ? 'Back' : 'Close'}
          >
            {onBack ? <ArrowLeft size={22} /> : <X size={22} />}
          </button>
          <h2 className="text-base font-semibold text-gray-900 truncate flex-1 text-center">{title}</h2>
          {formId || onSave ? (
            <button
              type={formId ? 'submit' : 'button'}
              form={formId}
              onClick={formId ? undefined : onSave}
              disabled={saveDisabled || saveLoading}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {saveLoading ? 'Saving…' : saveLabel}
            </button>
          ) : (
            <div className="w-9 shrink-0" aria-hidden />
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-gray-200 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  )
}
