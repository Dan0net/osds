import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'approve' | 'decline' | 'cancel' | 'destructive-text'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
  approve: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50',
  decline: 'text-red-600 hover:text-red-700 disabled:opacity-50',
  cancel: 'text-red-600 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50',
  'destructive-text': 'text-red-500 hover:text-red-600 disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-sm font-medium px-3 py-1.5',
  md: 'text-sm font-semibold px-4 py-2',
  lg: 'text-base font-semibold px-5 py-3',
}

const TEXT_ONLY = new Set<Variant>(['decline', 'destructive-text'])

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: Props) {
  const isTextOnly = TEXT_ONLY.has(variant)
  const sizeClasses = isTextOnly ? 'text-sm font-medium' : SIZE_CLASSES[size]
  const baseShape = isTextOnly ? '' : 'rounded-lg'
  return (
    <button
      className={`cursor-pointer inline-flex items-center justify-center gap-1.5 ${baseShape} ${sizeClasses} ${VARIANT_CLASSES[variant]} disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
