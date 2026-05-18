import { useEffect, useState } from 'react'

const ANIM_MS = 180

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  loading = false,
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
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const confirmClass =
    confirmTone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={loading ? undefined : onClose}
      />
      <div
        className={`relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 transition duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
        {body && <p className="text-sm text-gray-500 mb-4">{body}</p>}
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
