import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useService, useUpdateService, useDeleteService } from '@/queries/services'
import ServiceForm from '@/features/services/ServiceForm'
import DetailHeader from '@/shared/DetailHeader'
import { Spinner } from '@/shared/Spinner'

export default function ServiceDetail() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/services'
  const backLabel = from?.startsWith('/account/bookings/') ? 'Booking' : 'Services'
  const [error, setError] = useState(null)
  const [formValid, setFormValid] = useState(false)

  const serviceQuery = useService(serviceId)
  const updateService = useUpdateService(serviceId)
  const deleteService = useDeleteService()
  const service = serviceQuery.data
  const loading = serviceQuery.isLoading

  async function handleSave(data) {
    setError(null)
    try {
      await updateService.mutateAsync(data)
      navigate('/account/services')
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleActive() {
    await updateService.mutateAsync({ active: !service.active })
  }

  async function handleDelete() {
    if (!confirm("Delete this service? Existing bookings won't be affected.")) return
    await deleteService.mutateAsync(serviceId)
    navigate('/account/services')
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>
  if (!service) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-sm text-gray-500">Service not found.</p>
      </>
    )
  }

  return (
    <>
      <DetailHeader
        backHref={backHref}
        backLabel={backLabel}
        title={service.name}
        right={
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
        }
      />

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
        disabled={!formValid || updateService.isPending}
        className="cursor-pointer w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        {updateService.isPending ? 'Saving…' : 'Save'}
      </button>
    </>
  )
}
