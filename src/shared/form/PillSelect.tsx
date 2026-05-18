import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function PillSelect({ value, onChange, options, fullWidth = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const active = options.find((o) => o.value === value)
  const label = active
    ? `${active.label}${active.count != null ? ` (${active.count})` : ''}`
    : ''

  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : 'inline-flex'} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${fullWidth ? 'w-full' : ''} h-10 lg:h-8 pl-4 pr-9 bg-gray-100 hover:bg-gray-200 rounded-full text-sm lg:text-xs font-medium text-gray-700 inline-flex items-center cursor-pointer text-left`}
      >
        <span className="truncate">{label}</span>
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-1 z-20 flex flex-col gap-0.5">
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left h-10 lg:h-8 pl-3 pr-3 rounded-full text-sm lg:text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Check size={14} className={`shrink-0 ${isActive ? 'text-indigo-700' : 'text-transparent'}`} />
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.count != null && (
                  <span className={`text-[10px] font-semibold px-1.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {opt.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
