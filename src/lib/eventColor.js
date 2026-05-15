const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

function colorFromId(id) {
  if (!id) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function colorForBooking(booking, { isWalker }) {
  if (!isWalker) {
    return booking.walker_profiles?.theme_color || '#4f46e5'
  }
  return colorFromId(booking.client_id)
}
