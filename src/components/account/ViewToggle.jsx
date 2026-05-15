import { CalendarDays, List } from 'lucide-react'

const OPTIONS = [
  { value: 'calendar', icon: CalendarDays, label: 'Calendar view' },
  { value: 'list', icon: List, label: 'List view' },
]

export default function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            aria-pressed={active}
            className={`cursor-pointer flex items-center justify-center w-9 h-8 rounded-md transition ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        )
      })}
    </div>
  )
}
