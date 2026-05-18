import { useEffect } from 'react'
import { queryClient } from './queryClient'

// Bridges legacy `account-data-mutated` window events to TanStack cache invalidation.
// Can be removed once all dispatchers move to mutation hooks that invalidate directly.
export function GlobalEventBridge() {
  useEffect(() => {
    const onMutated = () => queryClient.invalidateQueries()
    window.addEventListener('account-data-mutated', onMutated)
    return () => window.removeEventListener('account-data-mutated', onMutated)
  }, [])
  return null
}
