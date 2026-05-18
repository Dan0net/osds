import type { ReactNode } from 'react'
import { useOutlet } from 'react-router-dom'

interface Props {
  list?: ReactNode
  listHeader?: ReactNode
  emptyDetail?: ReactNode
  sidebar?: ReactNode
  mobile?: ReactNode
}

export default function ListDetailLayout({ list, listHeader, emptyDetail = null, sidebar, mobile }: Props) {
  const outlet = useOutlet()

  const desktopSidebar = sidebar ?? (
    <>
      {listHeader}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">{list}</div>
    </>
  )
  const mobileContent = mobile ?? (
    <>
      {listHeader}
      <div className="space-y-1 -mx-4">{list}</div>
    </>
  )

  return (
    <>
      <div className="hidden lg:flex lg:fixed lg:left-56 lg:right-0 lg:top-0 lg:bottom-[var(--install-prompt-h,0px)] lg:bg-white">
        <aside className="w-[var(--list-sidebar-w,14rem)] border-r border-gray-200 bg-white flex flex-col">
          {desktopSidebar}
        </aside>
        <section className="flex-1 overflow-y-auto flex flex-col">
          <div className="max-w-3xl mx-auto w-full px-4 py-5 flex-1 flex flex-col min-h-0">
            {outlet || emptyDetail}
          </div>
        </section>
      </div>

      <div className="lg:hidden flex flex-col h-full">
        {outlet || mobileContent}
      </div>
    </>
  )
}
