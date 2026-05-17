import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAutoSelectFirst } from '../../hooks/useAutoSelectFirst'
import SearchList from '../../components/account/SearchList'
import SearchInput from '../../components/account/SearchInput'
import Modal from '../../components/Modal'
import ServiceForm from '../../components/account/ServiceForm'
import ListDetailLayout from '../../components/account/ListDetailLayout'
import ListPaneHeader, { ListPaneSubrow } from '../../components/account/ListPaneHeader'
import ListItem from '../../components/account/ListItem'

export default function AccountServices() {
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formValid, setFormValid] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!walkerProfile) return
    loadServices()
  }, [walkerProfile?.id])

  async function loadServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('walker_id', walkerProfile.id)
      .order('created_at')
    setServices(data || [])
    setLoading(false)
  }

  useAutoSelectFirst({
    items: services,
    getHref: (s) => `/account/services/${s.id}`,
    enabled: !!walkerProfile,
  })

  async function handleCreate(data) {
    setSubmitting(true)
    const { data: inserted } = await supabase
      .from('services')
      .insert({ ...data, walker_id: walkerProfile.id })
      .select()
      .single()
    setSubmitting(false)
    await loadServices()
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
      className="cursor-pointer h-8 w-8 inline-flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
    >
      <Plus size={16} />
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
    <p className="text-sm text-gray-400 px-3 py-3">Loading…</p>
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
        saveLoading={submitting}
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
