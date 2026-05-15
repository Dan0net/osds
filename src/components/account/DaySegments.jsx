export default function DaySegments({ events }) {
  if (!events || events.length === 0) {
    return <div className="h-1.5 mt-1" aria-hidden />
  }

  if (events.length === 1) {
    return (
      <div className="flex justify-center mt-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: events[0].color }}
        />
      </div>
    )
  }

  const MAX = 4
  const segments = events.slice(0, MAX)

  return (
    <div className="flex justify-center mt-1">
      <div className="h-1.5 rounded-full overflow-hidden flex w-8">
        {segments.map((event, i) => (
          <span
            key={event.id + '-' + i}
            className="flex-1"
            style={{ backgroundColor: event.color }}
          />
        ))}
      </div>
    </div>
  )
}
