import { useMemo } from 'react'

export default function SearchList({
  items,
  query = '',
  searchFields = ['name'],
  renderItem,
  emptyState = 'No items yet',
}) {
  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const needle = query.trim().toLowerCase()
    return items.filter((item) =>
      searchFields.some((field) => {
        const v = field.split('.').reduce((o, k) => (o == null ? o : o[k]), item)
        return v != null && String(v).toLowerCase().includes(needle)
      }),
    )
  }, [items, query, searchFields])

  if (filtered.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        {query ? `No matches for "${query}"` : emptyState}
      </p>
    )
  }
  return <>{filtered.map(renderItem)}</>
}
