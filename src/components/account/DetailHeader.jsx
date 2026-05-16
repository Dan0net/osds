import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DetailHeader({ backHref, backLabel = 'Back', title, right }) {
  return (
    <>
      <div className="-mx-4 px-3 pb-3 lg:pb-5 border-b border-gray-200 mb-3 lg:mb-4 flex items-center">
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
