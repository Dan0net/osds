import { useState, useRef } from 'react'
import BookingsList from './BookingsList'

export default function BookingsSidebar({
  eventsByDay,
  selectedDate,
  onSelectDate,
  setupItems,
  drawerHeight = 'half',
  onToggleDrawerHeight,
}: any) {
  const [dragActive, setDragActive] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartRef = useRef({ y: 0, h: 0 })

  function handleDragPointerDown(e) {
    if (e.target.closest('button')) return
    const heightPx = drawerHeight === 'full'
      ? window.innerHeight - 56
      : window.innerHeight * 0.5
    dragStartRef.current = { y: e.clientY, h: heightPx }
    setDragActive(true)
    setDragOffset(0)

    function move(ev) {
      setDragOffset(ev.clientY - dragStartRef.current.y)
    }
    function up(ev) {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
      const dy = ev.clientY - dragStartRef.current.y
      setDragActive(false)
      setDragOffset(0)
      const TAP = 6
      const THRESHOLD = 40
      if (Math.abs(dy) < TAP) onToggleDrawerHeight()
      else if (dy < -THRESHOLD && drawerHeight === 'half') onToggleDrawerHeight()
      else if (dy > THRESHOLD && drawerHeight === 'full') onToggleDrawerHeight()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
  }

  const fullMax = `calc(100dvh - 56px - env(safe-area-inset-bottom) - 4rem - var(--install-prompt-h, 0px))`
  const baseHeight = drawerHeight === 'full' ? fullMax : '50dvh'
  const height = dragActive
    ? `${Math.max(80, Math.min(window.innerHeight - 56 - 64, dragStartRef.current.h - dragOffset))}px`
    : baseHeight

  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-30 bg-white border-t border-gray-200 rounded-t-2xl shadow-xl flex flex-col"
      style={{
        bottom: 'calc(56px + env(safe-area-inset-bottom) + var(--install-prompt-h, 0px))',
        height,
        transition: dragActive ? 'none' : 'height 200ms ease-out',
      }}
      role="region"
      aria-label="Bookings"
    >
      <div
        className="rounded-t-2xl px-4 pt-2 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragPointerDown}
      >
        <div className="flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
      <BookingsList
        eventsByDay={eventsByDay}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        setupItems={setupItems}
        className="flex-1 pb-3"
      />
    </div>
  )
}
