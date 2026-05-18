import type { ComponentType, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type Tone = 'default' | 'amber'

const TONE_CLASSES: Record<Tone, string> = {
  default: 'bg-white border-gray-200',
  amber: 'bg-amber-50 border-amber-200',
}
const ICON_TONE: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-500',
  amber: 'bg-amber-100 text-amber-700',
}

interface Props {
  icon?: ComponentType<{ size?: number }>
  label?: ReactNode
  value?: ReactNode
  secondary?: ReactNode
  to?: string | null
  href?: string | null
  state?: unknown
  onClick?: () => void
  right?: ReactNode
  tone?: Tone
}

export default function LinkRow({ icon: Icon, label, value, secondary, to, href, state, onClick, right, tone = 'default' }: Props) {
  const inner = (
    <>
      {Icon && (
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICON_TONE[tone]}`}>
          <Icon size={18} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        {label && <p className="text-xs text-gray-500">{label}</p>}
        {value && <p className="text-sm font-medium text-gray-900 truncate">{value}</p>}
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      {right}
      {(to || href || onClick) && <ChevronRight size={18} className="text-gray-400 shrink-0" />}
    </>
  )

  const className = `flex items-center gap-3 border rounded-lg px-3 py-3 ${TONE_CLASSES[tone]}`
  const hoverClassName = ' hover:border-indigo-300 hover:bg-indigo-50/40 transition'

  if (href) {
    const isExternal = /^https?:/.test(href)
    const targetProps = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    return (
      <a href={href} {...targetProps} className={`${className}${hoverClassName}`}>
        {inner}
      </a>
    )
  }
  if (to) {
    return (
      <Link to={to} state={state} className={`${className}${hoverClassName}`}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className}${hoverClassName} cursor-pointer text-left w-full`}>
        {inner}
      </button>
    )
  }
  return <div className={className}>{inner}</div>
}
