import { useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export default function PaidSuccessModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, 4000)
    return () => clearTimeout(id)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-8 flex flex-col items-center text-center">
        <DotLottieReact
          src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/lottie.json"
          autoplay
          loop
          className="w-40 h-40"
        />
        <h3 className="mt-4 text-xl font-semibold text-gray-900">Payment successful!</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-xs">
          Your booking is now confirmed.
        </p>
      </div>
    </div>
  )
}
