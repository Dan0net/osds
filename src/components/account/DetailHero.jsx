import { toneClass } from '../../lib/bookingStatus'

export default function DetailHero({ icon: Icon, tone = 'gray', primary, secondary, status, extra, action }) {
  const trailing = (action || status) && (
    action || <span className="text-sm font-semibold uppercase tracking-wide">{status}</span>
  )
  return (
    <div className={`rounded-xl ${toneClass(tone)} px-5 py-4 mb-4 flex items-center gap-4`}>
      {Icon && (
        <div className="shrink-0">
          <Icon size={32} strokeWidth={2} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-2xl lg:text-3xl font-bold leading-tight truncate">{primary}</p>
        {secondary && <p className="text-sm mt-0.5 opacity-80">{secondary}</p>}
        {extra && <div className="mt-1.5">{extra}</div>}
        {trailing && <div className="mt-3">{trailing}</div>}
      </div>
    </div>
  )
}
