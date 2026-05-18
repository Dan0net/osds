import { Spinner } from '@/shared/Spinner'
import { useIsProbingExternal } from '@/queries/ical'

export default function SyncSpinner({ walkerId, className = '' }: { walkerId: string | undefined; className?: string }) {
  const probing = useIsProbingExternal(walkerId)
  if (!probing) return null
  return <Spinner size="xs" className={className} />
}
