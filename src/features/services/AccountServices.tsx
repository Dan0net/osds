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
    <button
      onClick={() => setAddOpen(true)}
      aria-label="Add service"
      className="cursor-pointer h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
    >
      <Plus size={16} />
      Add service
    </button>
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
              {svc.service_type === 'overnight' && (
                <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">overnight</span>
              )}
              {!svc.active && (
                <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">inactive</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              £{(svc.price_cents / 100).toFixed(2)}{svc.service_type === 'overnight' ? '/night' : ''} · {svc.duration_minutes}m
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
