import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useService, useUpdateService, useDeleteService } from '@/queries/services'
import ServiceForm from '@/features/services/ServiceForm'
import DetailHeader from '@/shared/detail/DetailHeader'
import { Spinner } from '@/shared/Spinner'
import Button from '@/shared/form/Button'
import Alert from '@/shared/Alert'

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
            <Button onClick={toggleActive} variant="secondary" size="sm">
              {service.active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button onClick={handleDelete} variant="destructive-text" size="sm">
              Delete
            </Button>
          </div>
        }
      />

      {error && <Alert className="mb-4">{error}</Alert>}

      <ServiceForm
        formId="service-edit-form"
        initial={service}
        onSubmit={handleSave}
        onValidityChange={setFormValid}
      />
      <Button
        type="submit"
        form="service-edit-form"
        disabled={!formValid || updateService.isPending}
        className="w-full mt-4"
        size="md"
      >
        {updateService.isPending ? 'Saving…' : 'Save'}
      </Button>
    </>
  )
}
