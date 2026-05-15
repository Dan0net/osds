import { useState, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'

export default function SearchList({
  items,
  searchFields = ['name'],
  renderItem,
  onAdd,
  addLabel = 'Add',
  emptyState = 'No items yet',
  placeholder = 'Search…',
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return items
    const needle = q.trim().toLowerCase()
    return items.filter((item) =>
      searchFields.some((field) => {
        const v = field.split('.').reduce((o, k) => (o == null ? o : o[k]), item)
        return v != null && String(v).toLowerCase().includes(needle)
      }),
    )
  }, [items, q, searchFields])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="cursor-pointer inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{addLabel}</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          {q ? `No matches for "${q}"` : emptyState}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(renderItem)}
        </div>
      )}
    </div>
  )
}
