type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

interface Props {
  src?: string | null
  name?: string | null
  size?: Size
  className?: string
}

export default function Avatar({ src, name, size = 'md', className = '' }: Props) {
  const initial = (name?.charAt(0) || '?').toUpperCase()
  return (
    <div className={`${SIZE_CLASSES[size]} rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shrink-0 ${className}`}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initial}
    </div>
  )
}
