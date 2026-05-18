import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useServices, useCreateService } from '@/queries/services'
import { useAutoSelectFirst } from '@/shared/useAutoSelectFirst'
import SearchList from '@/shared/list/SearchList'
import SearchInput from '@/shared/list/SearchInput'
import Modal from '@/shared/modal/Modal'
import ServiceForm from '@/features/services/ServiceForm'
import ListDetailLayout from '@/shared/layout/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '@/shared/list/ListPaneHeader'
import ListItem from '@/shared/list/ListItem'
import { Spinner } from '@/shared/Spinner'
import Badge from '@/shared/Badge'
import Button from '@/shared/form/Button'
import { formatGBP } from '@/utils/formatting'

export default function AccountServices() {
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [formValid, setFormValid] = useState(false)
  const [query, setQuery] = useState('')

  const servicesQuery = useServices(walkerProfile?.id)
  const createService = useCreateService(walkerProfile?.id)
  const services = servicesQuery.data || []
  const loading = servicesQuery.isLoading

  useAutoSelectFirst({
    items: services,
    getHref: (s) => `/account/services/${s.id}`,
    enabled: !!walkerProfile,
  })

  async function handleCreate(data: any) {
    const inserted = await createService.mutateAsync(data) as any
    setAddOpen(false)
    if (inserted) navigate(`/account/services/${inserted.id}`)
    return inserted
  }

  if (!walkerProfile) {
    return <p className="text-sm text-gray-500">Services are only available for walkers.</p>
  }

  const addButton = (
    <Button onClick={() => setAddOpen(true)} aria-label="Add service" className="h-8 px-3">
      <Plus size={16} />
      Add service
    </Button>
  )

  const listHeader = (
    <>
      <ListPaneHeader title="Services" right={addButton} />
      <ListPaneSubrow>
        <SearchInput value={query} onChange={setQuery} placeholder="Search services…" />
      </ListPaneSubrow>
    </>
  )

  const list = loading ? (
    <div className="flex justify-center py-8"><Spinner /></div>
  ) : (
    <SearchList
      items={services}
      query={query}
      searchFields={['name', 'description']}
      emptyState="No services yet. Add your first one to start accepting bookings."
      renderItem={(svc) => (
        <ListItem key={svc.id} to={`/account/services/${svc.id}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium truncate ${!svc.active ? 'opacity-60' : ''}`}>{svc.name}</span>
              {svc.service_type === 'overnight' && <Badge tone="indigo" size="sm">overnight</Badge>}
              {!svc.active && <Badge tone="gray" size="sm">inactive</Badge>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {formatGBP(svc.price_cents)}{svc.service_type === 'overnight' ? '/night' : ''} · {svc.duration_minutes}m
            </div>
          </div>
        </ListItem>
      )}
    />
  )

  return (
    <>
      <ListDetailLayout
        list={list}
        listHeader={listHeader}
        emptyDetail={<p className="text-sm text-gray-400">Select a service.</p>}
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New service"
        formId="service-form"
        saveDisabled={!formValid}
        saveLoading={createService.isPending}
      >
        <ServiceForm
          formId="service-form"
          onSubmit={handleCreate}
          onValidityChange={setFormValid}
        />
      </Modal>
    </>
  )
}
