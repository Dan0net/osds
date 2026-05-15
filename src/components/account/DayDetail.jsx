import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { X } from 'lucide-react'

const ANIM_MS = 200

const STATUS_LABELS = {
  requested: 'Pending',
  approved: 'Approved',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  pending: 'Awaiting payment',
  hold: 'On hold',
  refunded: 'Refunded',
}

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  pending: 'bg-blue-100 text-blue-700',
  hold: 'bg-purple-100 text-purple-700',
  refunded: 'bg-gray-100 text-gray-600',
}

function EventRow({ event, onClose }) {
  const inner = (
    <>
      <span
        className="w-1 rounded-full shrink-0"
        style={{ backgroundColor: event.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-sm truncate">{event.title}</span>
          <span className="text-xs text-gray-500 shrink-0">{event.timeLabel}</span>
        </div>
        {event.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{event.subtitle}</p>
        )}
        {event.status && (
          <span className={`inline-block mt-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[event.status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[event.status] || event.status}
          </span>
        )}
      </div>
    </>
  )

  if (event.external) {
    return (
      <div className="flex items-stretch gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={`/account/bookings/${event.id}`}
      onClick={onClose}
      className="flex items-stretch gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition"
    >
      {inner}
    </Link>
  )
}

function DayContent({ date, events, onClose, showClose = false }) {
  const heading = date ? format(date, 'EEEE d MMMM') : 'Select a day'

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{heading}</h3>
        {showClose && (
          <button
            onClick={onClose}
            className="cursor-pointer p-2 -m-2 text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-gray-400">No bookings on this day.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => (
            <EventRow key={event.id + '-' + i} event={event} onClose={onClose} />
          ))}
        </div>
      )}
    </>
  )
}

export default function DayDetail({ date, events, open, onClose }) {
  // Desktop sidebar — always rendered, no animation
  // Mobile sheet — slides up from bottom, covers half the screen
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      setVisible(false)
      const id = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(id)
    }
  }, [open])

  useEffect(() => {
    if (!mounted || !open) return
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [mounted, open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 bg-white border border-gray-200 rounded-xl p-4 h-fit sticky top-6">
        <DayContent date={date} events={events} onClose={onClose} />
      </aside>

      {/* Mobile slide-up sheet — sits above the bottom nav bar */}
      {mounted && (
        <div
          className={`lg:hidden fixed left-0 right-0 h-[40vh] z-30 bg-white border-t border-gray-200 rounded-t-2xl shadow-xl flex flex-col transition-transform duration-200 ease-out bottom-[calc(56px+env(safe-area-inset-bottom))] ${
            visible ? 'translate-y-0' : 'translate-y-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 overflow-y-auto">
            <DayContent date={date} events={events} onClose={onClose} showClose />
          </div>
        </div>
      )}
    </>
  )
}
