import { useEffect } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'

export function useAutoSelectFirst({ items, getHref, enabled = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    if (!enabled) return
    if (outlet) return
    if (!items || items.length === 0) return
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    const href = getHref(items[0])
    if (!href || href === location.pathname) return
    navigate(href, { replace: true })
  }, [items, outlet, enabled])
}
