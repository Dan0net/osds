import type { ReactNode } from 'react'
import { toneClass } from '@/utils/bookingStatus'

type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[10px] font-medium px-1.5 py-0.5 rounded',
  md: 'text-xs font-medium px-2 py-0.5 rounded',
}

interface Props {
  tone?: string
  size?: Size
  children: ReactNode
  className?: string
}

export default function Badge({ tone = 'gray', size = 'md', children, className = '' }: Props) {
  return (
    <span className={`${SIZE_CLASSES[size]} ${toneClass(tone)} ${className}`}>{children}</span>
  )
}
