import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

export default function SearchList({
  items,
  searchFields = ['name'],
  renderItem,
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
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          {q ? `No matches for "${q}"` : emptyState}
        </p>
      ) : (
        <div className="space-y-1">{filtered.map(renderItem)}</div>
      )}
    </div>
  )
}
