import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  backHref: string
  backLabel?: string
  title?: string
  right?: ReactNode
  avatarUrl?: string | null
  titleHref?: string | null
  titleTarget?: '_blank' | '_self'
}

export default function DetailHeader({ backHref, backLabel = 'Back', title, right, avatarUrl, titleHref, titleTarget }: Props) {
  const initial = (title?.charAt(0) || '?').toUpperCase()
  const showAvatar = avatarUrl !== undefined || !!titleHref

  const titleInner = (
    <>
      {showAvatar && (
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
        </div>
      )}
      {title && (
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 truncate flex-1 min-w-0">
          {title}
        </h1>
      )}
    </>
  )

  const groupClass = 'flex items-center gap-3 flex-1 min-w-0'
  const titleGroup = titleHref
    ? (titleTarget === '_blank'
      ? <a href={titleHref} target="_blank" rel="noopener noreferrer" className={`${groupClass} hover:opacity-80 active:opacity-70`}>{titleInner}</a>
      : <Link to={titleHref} className={`${groupClass} hover:opacity-80 active:opacity-70`}>{titleInner}</Link>)
    : <div className={groupClass}>{titleInner}</div>

  return (
    <>
      <div className="lg:hidden -mx-4 px-3 pb-3 border-b border-gray-200 mb-3 flex items-center">
        <Link
          to={backHref}
          className="cursor-pointer inline-flex items-center gap-0.5 p-2 -m-1 text-gray-900 hover:text-gray-600 active:opacity-70"
        >
          <ChevronLeft size={22} />
          <span className="text-base font-medium">{backLabel}</span>
        </Link>
      </div>
      {(title || right) && (
        <div className="flex items-start gap-3 mb-3 lg:mb-4 px-1">
          {titleGroup}
          {right && <div className="shrink-0 mt-1">{right}</div>}
        </div>
      )}
    </>
  )
}
