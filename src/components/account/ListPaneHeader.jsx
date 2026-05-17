export default function ListPaneHeader({ title, right }) {
  return (
    <div className="shrink-0 -mx-4 lg:mx-0 px-4 py-3 lg:py-4 border-b border-gray-200 flex items-center justify-between gap-2 lg:h-[4.5rem]">
      <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

export function ListPaneSubrow({ children }) {
  return (
    <div className="shrink-0 -mx-4 lg:mx-0 px-3 py-2">
      {children}
    </div>
  )
}
