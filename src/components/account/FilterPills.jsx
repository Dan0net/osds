export default function FilterPills({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 flex-wrap">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer px-2.5 h-7 inline-flex items-center gap-1 rounded-md text-xs font-medium transition ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count != null && (
              <span className={`text-[10px] font-semibold px-1 rounded ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
