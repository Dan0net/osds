import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LinkRow({ icon: Icon, label, value, secondary, to, href, state, onClick, right }) {
  const inner = (
    <>
      {Icon && (
        <span className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
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

  const className = 'flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-3'
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
