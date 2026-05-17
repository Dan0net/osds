import { useOutlet } from 'react-router-dom'

export default function ListDetailLayout({ list, listHeader, emptyDetail = null }) {
  const outlet = useOutlet()

  return (
    <>
      <div className="hidden lg:flex lg:fixed lg:left-64 lg:right-0 lg:top-0 lg:bottom-[var(--install-prompt-h,0px)] lg:bg-white">
        <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
          {listHeader && <div className="shrink-0 px-3 py-3 border-b border-gray-200">{listHeader}</div>}
          <div className="flex-1 overflow-y-auto px-3 py-3">{list}</div>
        </aside>
        <section className="flex-1 overflow-y-auto flex flex-col">
          <div className="max-w-3xl mx-auto w-full px-4 py-5 flex-1 flex flex-col min-h-0">
            {outlet || emptyDetail}
          </div>
        </section>
      </div>

      <div className="lg:hidden flex flex-col h-full">
        {outlet || (
          <>
            {listHeader && <div className="mb-3 shrink-0">{listHeader}</div>}
            {list}
          </>
        )}
      </div>
    </>
  )
}
