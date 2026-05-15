import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { clientPriceCents } from '../../lib/utils'
import SearchList from '../../components/account/SearchList'
import Modal from '../../components/Modal'
import ServiceForm from '../../components/account/ServiceForm'

export default function AccountServices() {
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div>
      <h1 className="text-2xl mb-6">Services</h1>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <SearchList
          items={services}
          searchFields={['name', 'description']}
          placeholder="Search services…"
          addLabel="Add service"
          emptyState="No services yet. Add your first one to start accepting bookings."
          onAdd={() => setAddOpen(true)}
          renderItem={(svc) => (
            <Link
              key={svc.id}
              to={`/account/services/${svc.id}`}
              className={`block bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition ${!svc.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{svc.name}</span>
                    {svc.service_type === 'overnight' && (
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">overnight</span>
                    )}
                    {!svc.active && (
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">inactive</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Client pays £{(clientPriceCents(svc.price_cents) / 100).toFixed(2)}
                    {svc.service_type === 'overnight' ? '/night' : ''} · {svc.duration_minutes} min
                  </div>
                </div>
              </div>
            </Link>
          )}
        />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New service">
        <ServiceForm onSubmit={handleCreate} onCancel={() => setAddOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  )
}
