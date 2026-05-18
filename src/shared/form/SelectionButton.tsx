import { ChevronDown, Plus } from 'lucide-react'

export default function SelectionButton({ empty, emptyLabel, onClick, primary, secondary }: any) {
  if (empty) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition text-left"
      >
        <div className="w-9 h-9 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0">
          <Plus size={18} />
        </div>
        <span className="text-sm font-semibold text-indigo-700">{emptyLabel}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer w-full border border-gray-300 hover:border-indigo-300 rounded-lg px-3 py-2.5 flex items-center justify-between text-left transition"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      <ChevronDown size={16} className="text-gray-400 shrink-0" />
    </button>
  )
}
