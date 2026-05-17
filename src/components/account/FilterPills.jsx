export default function FilterPills({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer h-10 lg:h-8 px-4 lg:px-3 inline-flex items-center gap-1.5 rounded-full text-sm lg:text-xs font-medium transition ${
              active
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count != null && (
              <span className={`text-[11px] lg:text-[10px] font-semibold px-1.5 rounded-full ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600'}`}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
