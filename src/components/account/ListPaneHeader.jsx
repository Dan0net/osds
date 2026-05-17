export default function ListPaneHeader({ title, right }) {
  return (
    <div className="shrink-0 -mx-4 lg:mx-0 px-4 py-3 lg:py-4 border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 lg:h-10">
        <h2 className="text-xl font-semibold text-gray-900 truncate">{title}</h2>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  )
}

export function ListPaneSubrow({ children }) {
  return (
    <div className="shrink-0 -mx-4 lg:mx-0 p-3">
      {children}
    </div>
  )
}
