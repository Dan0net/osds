import { useState, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Mail, Phone, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/Modal'
import PetForm from '../../components/account/PetForm'
import DetailHeader from '../../components/account/DetailHeader'
import { bookingStatusBadge, toneClass } from '../../lib/bookingStatus'

const PET_FORM_ID = 'customer-pet-form'

export default function CustomerDetail() {
  const { clientId } = useParams()
  const { walkerProfile } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const backHref = from || '/account/customers'
  const backLabel = (() => {
    if (from?.startsWith('/account/bookings/')) return 'Booking'
    if (from?.startsWith('/account/payments/')) return 'Payment'
    return 'Customers'
  })()
  const [client, setClient] = useState(null)
  const [bookings, setBookings] = useState([])
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | pet object
  const [formValid, setFormValid] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!walkerProfile) return
    load()
  }, [clientId, walkerProfile?.id])

  async function load() {
    setLoading(true)
    const [bkRes, petsRes, userRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, services(name), pets(*), payments(source), users:client_id(id, name, email, phone, avatar_url)')
        .eq('walker_id', walkerProfile.id)
        .eq('client_id', clientId)
        .order('booking_date', { ascending: false }),
      supabase.from('pets').select('*').eq('user_id', clientId),
      supabase.from('users').select('id, name, email, phone, avatar_url').eq('id', clientId).maybeSingle(),
    ])

    setBookings(bkRes.data || [])
    setPets(petsRes.data || [])
    setClient(bkRes.data?.[0]?.users || userRes.data || null)
    setLoading(false)
  }

  async function handleSubmit(payload) {
    setSaving(true)
    if (editing === 'new') {
      await supabase.from('pets').insert({ user_id: clientId, ...payload })
    } else if (editing?.id) {
      await supabase.from('pets').update(payload).eq('id', editing.id)
    }
    setSaving(false)
    setEditing(null)
    await load()
  }

  async function removePet(id) {
    if (!confirm('Remove this pet?')) return
    await supabase.from('pets').delete().eq('id', id)
    await load()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

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

      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold overflow-hidden shrink-0">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (client.name?.charAt(0) || '?').toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl truncate">{client.name || 'Unknown'}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
            {client.email && (
              <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-gray-800">
                <Mail size={14} /> {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 hover:text-gray-800">
                <Phone size={14} /> {client.phone}
              </a>
            )}
          </div>
        </div>
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
