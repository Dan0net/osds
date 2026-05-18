import type { ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'info' | 'success'

const TONE_CLASSES: Record<Tone, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
}

interface Props {
  tone?: Tone
  children?: ReactNode
  className?: string
}

export default function Alert({ tone = 'error', children, className = '' }: Props) {
  if (!children) return null
  return (
    <div className={`border text-sm rounded-lg px-4 py-3 ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </div>
  )
}
