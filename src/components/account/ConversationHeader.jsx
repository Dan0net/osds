import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function ConversationHeader({ name, avatarUrl, to, target }) {
  const initial = (name?.charAt(0) || '?').toUpperCase()
  const inner = (
    <>
      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name || 'Unknown'}</p>
      </div>
      {to && <ChevronRight size={18} className="text-gray-400 shrink-0" />}
    </>
  )
  const className = 'flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2'

  if (!to) return <div className={className}>{inner}</div>
  if (target === '_blank') {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-indigo-300 hover:bg-indigo-50/40 transition`}>
        {inner}
      </a>
    )
  }
  return (
    <Link to={to} className={`${className} hover:border-indigo-300 hover:bg-indigo-50/40 transition`}>
      {inner}
    </Link>
  )
}
