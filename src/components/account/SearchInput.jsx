import { Search } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 lg:h-9 pl-9 pr-3 bg-gray-100 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none border-0"
      />
    </div>
  )
}
