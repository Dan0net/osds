// 0 events  → empty placeholder.
// 1 event   → single coloured dot.
// 2+ events → one fixed-width bar split into proportional segments; each
//             segment's width is the event's share of total duration that day.

export default function DaySegments({ events }) {
  const active = (events || []).filter((e) => !e.inactive)

  if (active.length === 0) {
    return <div className="h-1.5 mt-1" aria-hidden />
  }

  if (active.length === 1) {
    return (
      <div className="flex justify-center mt-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active[0].color }} />
      </div>
    )
  }

  const total = active.reduce((sum, e) => sum + (e.durationMinutes || 30), 0) || 1

  return (
    <div className="flex justify-center mt-1">
      <div className="h-1.5 rounded-full overflow-hidden flex w-8">
        {active.map((event, i) => (
          <span
            key={event.id + '-' + i}
            style={{
              backgroundColor: event.color,
              flexGrow: (event.durationMinutes || 30) / total,
              flexBasis: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
