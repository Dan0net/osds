import { useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface Props {
  open: boolean
  onClose: () => void
  lottieUrl: string
  title: string
  subtitle?: string
  footnote?: string
  autoDismissMs?: number
}

export default function CelebrationModal({
  open,
  onClose,
  lottieUrl,
  title,
  subtitle,
  footnote,
  autoDismissMs = 4000,
}: Props) {
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(id)
  }, [open, onClose, autoDismissMs])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-8 flex flex-col items-center text-center">
        <DotLottieReact src={lottieUrl} autoplay loop className="w-40 h-40" />
        <h3 className="mt-4 text-xl font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-2 text-2xl font-bold text-green-600">{subtitle}</p>}
        {footnote && <p className="mt-1 text-sm text-gray-500">{footnote}</p>}
      </div>
    </div>
  )
}
