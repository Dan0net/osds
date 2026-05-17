import { toneClass } from '../../lib/bookingStatus'

export default function DetailHero({ icon: Icon, tone = 'gray', primary, secondary, status, extra }) {
  return (
    <div className={`rounded-xl ${toneClass(tone)} px-5 py-4 mb-4 flex items-center gap-4`}>
      {Icon && (
        <div className="shrink-0">
          <Icon size={32} strokeWidth={2} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-2xl lg:text-3xl font-bold leading-tight truncate">{primary}</p>
          {status && (
            <span className="text-sm font-semibold uppercase tracking-wide shrink-0">{status}</span>
          )}
        </div>
        {secondary && <p className="text-sm mt-0.5 opacity-80">{secondary}</p>}
        {extra && <div className="mt-1.5">{extra}</div>}
      </div>
    </div>
  )
}
