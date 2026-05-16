import { Map } from 'lucide-react'

export default function MapButton({ postcode, size = 22, className = 'p-1' }) {
  if (!postcode) return null
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(postcode)}`
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        window.open(url, '_blank', 'noopener,noreferrer')
      }}
      aria-label={`Navigate to ${postcode}`}
      className={`cursor-pointer shrink-0 text-gray-500 hover:text-indigo-600 active:opacity-70 ${className}`}
    >
      <Map size={size} />
    </button>
  )
}
