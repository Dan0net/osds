import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Mail, Phone, Map, Plus, MessageCircle } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useCustomerDetail } from '@/queries/customers'
import { usePets, useCreatePet, useUpdatePet, useDeletePet } from '@/queries/pets'
import { useEnsureConversation } from '@/queries/messages'
import Modal from '@/shared/Modal'
import PetForm from '@/features/pets/PetForm'
import DetailHeader from '@/shared/DetailHeader'
import LinkRow from '@/shared/LinkRow'
import { bookingStatusBadge, toneClass } from '@/utils/bookingStatus'
import { Spinner } from '@/shared/Spinner'

const PET_FORM_ID = 'customer-pet-form'

export default function CustomerDetail() {
  const { clientId } = useParams()
  const { walkerProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/customers'
  const backLabel = (() => {
    if (from?.startsWith('/account/bookings/')) return 'Booking'
    if (from?.startsWith('/account/money/') || from?.startsWith('/account/payments/')) return 'Payment'
    return 'Customers'
  })()
  const [editing, setEditing] = useState(null) // null | 'new' | pet object
  const [formValid, setFormValid] = useState(false)

  const customerQuery = useCustomerDetail(walkerProfile?.id, clientId)
  const petsQuery = usePets(clientId)
  const createPet = useCreatePet()
  const updatePet = useUpdatePet()
  const deletePet = useDeletePet()
  const ensureConversation = useEnsureConversation()

  const client = customerQuery.data?.client
  const bookings = customerQuery.data?.bookings || []
  const pets = petsQuery.data || []
  const loading = customerQuery.isLoading || petsQuery.isLoading
  const saving = createPet.isPending || updatePet.isPending

  async function handleSubmit(payload) {
    if (editing === 'new') {
      await createPet.mutateAsync({ userId: clientId, pet: payload })
    } else if (editing?.id) {
      await updatePet.mutateAsync({ petId: editing.id, patch: payload })
    }
    setEditing(null)
  }

  async function removePet(id) {
    if (!confirm('Remove this pet?')) return
    await deletePet.mutateAsync(id)
  }

  async function openConversation() {
    const id = await ensureConversation.mutateAsync({ walkerId: walkerProfile.id, clientId })
    if (id) navigate(`/account/messages/${id}`)
  }

  if (loading) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <div className="flex justify-center py-8"><Spinner /></div>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <DetailHeader backHref={backHref} backLabel={backLabel} />
        <p className="text-sm text-gray-500">Customer not found.</p>
      </>
    )
  }

  return (
    <>
      <DetailHeader backHref={backHref} backLabel={backLabel} />

      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (client.name?.charAt(0) || '?').toUpperCase()
          )}
        </div>
        <h1 className="text-2xl truncate min-w-0 flex-1">{client.name || 'Unknown'}</h1>
      </div>

      <div className="space-y-2 mb-6">
        <LinkRow
          icon={MessageCircle}
          value="Message"
          secondary={client.name ? `Chat with ${client.name.split(' ')[0]}` : null}
          onClick={openConversation}
        />
        {client.email && (
          <LinkRow icon={Mail} value={client.email} href={`mailto:${client.email}`} />
        )}
        {client.phone && (
          <LinkRow icon={Phone} value={client.phone} href={`tel:${client.phone}`} />
        )}
        {client.postcode && (
          <LinkRow
            icon={Map}
            value="Get directions"
            secondary={client.postcode}
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.postcode)}`}
          />
        )}
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pets</h2>
          <button
            onClick={() => setEditing('new')}
            className="cursor-pointer inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} /> Add pet
          </button>
        </div>
        {pets.length === 0 ? (
          <p className="text-sm text-gray-400">No pets recorded.</p>
        ) : (
          <div className="space-y-3">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} onEdit={() => setEditing(pet)} onRemove={() => removePet(pet.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Booking history</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y">
            {bookings.map((b) => (
              <Link
                key={b.id}
                to={`/account/bookings/${b.id}`}
                state={{ from: `/account/customers/${clientId}` }}
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.services?.name || 'Service'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {b.pets?.name && ` · ${b.pets.name}`}
                  </p>
                </div>
                {(() => {
                  const badge = bookingStatusBadge(b)
                  return (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${toneClass(badge.tone)}`}>
                      {badge.label}
                    </span>
                  )
                })()}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New pet' : 'Edit pet'}
        formId={PET_FORM_ID}
        saveDisabled={!formValid}
        saveLoading={saving}
      >
        {editing && (
          <PetForm
            formId={PET_FORM_ID}
            initial={editing === 'new' ? null : editing}
            onValidityChange={setFormValid}
            onSubmit={handleSubmit}
          />
        )}
      </Modal>
    </>
  )
}

function PetCard({ pet, onEdit, onRemove }) {
  const ageStr = pet.birthday ? yearsSince(pet.birthday) : pet.age ? `${pet.age}y` : null
  const headlineBits = [
    pet.pet_type,
    pet.breed,
    pet.sex && pet.sex !== 'unknown' ? pet.sex : null,
    ageStr,
    pet.weight ? `${pet.weight}kg` : null,
    pet.spayed_neutered === true ? 'spayed/neutered' : null,
  ].filter(Boolean)

  const behaviour = []
  if (pet.friendly_with_kids) behaviour.push(['Kids', pet.friendly_with_kids])
  if (pet.friendly_with_dogs) behaviour.push(['Dogs', pet.friendly_with_dogs])
  if (pet.friendly_with_cats) behaviour.push(['Cats', pet.friendly_with_cats])
  if (pet.house_trained != null) behaviour.push(['House trained', pet.house_trained ? 'yes' : 'no'])
  if (pet.left_alone_hours != null) behaviour.push(['Left alone', `${pet.left_alone_hours}h`])
  if (pet.triggers) behaviour.push(['Triggers', pet.triggers])

  const health = []
  if (pet.allergies) health.push(['Allergies', pet.allergies])
  if (pet.medication) health.push(['Medication', pet.medication])

  const admin = []
  if (pet.vet_contact) admin.push(['Vet', pet.vet_contact])
  if (pet.emergency_contact_name || pet.emergency_contact_phone) {
    admin.push(['Emergency', [pet.emergency_contact_name, pet.emergency_contact_phone].filter(Boolean).join(' · ')])
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate">{pet.name}</p>
          {headlineBits.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{headlineBits.join(' · ')}</p>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={onEdit} className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700">Edit</button>
          <button onClick={onRemove} className="cursor-pointer text-sm text-red-500 hover:text-red-600">Remove</button>
        </div>
      </div>
      <Subsection title="Behaviour" rows={behaviour} />
      <Subsection title="Health" rows={health} />
      <Subsection title="Admin" rows={admin} />
    </div>
  )
}

function Subsection({ title, rows }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-3 first:mt-0">
      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</h4>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <RowKV key={k} k={k} v={v} />
        ))}
      </dl>
    </div>
  )
}

function RowKV({ k, v }) {
  return (
    <>
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-900 break-words">{v}</dd>
    </>
  )
}

function yearsSince(dateStr) {
  const then = new Date(dateStr)
  if (Number.isNaN(then.valueOf())) return null
  const now = new Date()
  let years = now.getFullYear() - then.getFullYear()
  const m = now.getMonth() - then.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) years--
  return `${years}y`
}
