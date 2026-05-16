import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DetailHeader({ backHref, backLabel = 'Back', title, right }) {
  return (
    <>
      <div className="-ml-1 mb-1">
        <Link
          to={backHref}
          className="cursor-pointer inline-flex items-center gap-0.5 h-10 pl-1 pr-2 text-gray-900 hover:text-gray-600 active:opacity-70"
        >
          <ChevronLeft size={24} strokeWidth={2.25} />
          <span className="text-base font-medium">{backLabel}</span>
        </Link>
      </div>
      {(title || right) && (
        <div className="flex items-start gap-3 mb-3 lg:mb-4 px-1">
          {title && (
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 truncate flex-1 min-w-0">
              {title}
            </h1>
          )}
          {right && <div className="shrink-0 mt-1">{right}</div>}
        </div>
      )}
    </>
  )
}
