import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import ServiceForm from '../../components/account/ServiceForm'

export default function ServiceDetail() {
  const { serviceId } = useParams()
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formValid, setFormValid] = useState(false)

  useEffect(() => {
    if (!walkerProfile) return
    supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('walker_id', walkerProfile.id)
      .maybeSingle()
      .then(({ data }) => {
        setService(data)
        setLoading(false)
      })
  }, [serviceId, walkerProfile?.id])

  async function handleSave(data) {
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from('services')
      .update(data)
      .eq('id', serviceId)
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    navigate('/account/services')
  }

  async function toggleActive() {
    await supabase
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id)
    setService((s) => ({ ...s, active: !s.active }))
  }

  async function handleDelete() {
    if (!confirm('Delete this service? Existing bookings won\'t be affected.')) return
    await supabase.from('services').delete().eq('id', serviceId)
    navigate('/account/services')
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!service) {
    return (
      <div>
        <Link to="/account/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft size={16} /> Back to services
        </Link>
        <p className="text-sm text-gray-500">Service not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Link to="/account/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={16} /> Back to services
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">{service.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleActive}
            className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {service.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={handleDelete}
            className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <ServiceForm
        formId="service-edit-form"
        initial={service}
        onSubmit={handleSave}
        onValidityChange={setFormValid}
      />
      <button
        type="submit"
        form="service-edit-form"
        disabled={!formValid || submitting}
        className="cursor-pointer w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
