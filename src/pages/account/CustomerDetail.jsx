import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Mail, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const STATUS_STYLES = {
  requested: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function CustomerDetail() {
  const { clientId } = useParams()
  const { walkerProfile } = useAuth()
  const [client, setClient] = useState(null)
  const [bookings, setBookings] = useState([])
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!walkerProfile) return
    load()
  }, [clientId, walkerProfile?.id])

  async function load() {
    setLoading(true)
    const { data: bk } = await supabase
      .from('bookings')
      .select('*, services(name), pets(*), users:client_id(id, name, email, phone, avatar_url)')
      .eq('walker_id', walkerProfile.id)
      .eq('client_id', clientId)
      .order('booking_date', { ascending: false })

    if (bk?.length) {
      setClient(bk[0].users)
      setBookings(bk)
      const petIds = [...new Set(bk.map((b) => b.pet_id).filter(Boolean))]
      if (petIds.length > 0) {
        const { data: petsData } = await supabase
          .from('pets')
          .select('*')
          .in('id', petIds)
        setPets(petsData || [])
      }
    } else {
      // Could be a client with no bookings yet — fall back to direct lookup
      const { data: u } = await supabase
        .from('users')
        .select('id, name, email, phone, avatar_url')
        .eq('id', clientId)
        .maybeSingle()
      setClient(u)
    }
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  if (!client) {
    return (
      <div>
        <Link to="/account/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft size={16} /> Back to customers
        </Link>
        <p className="text-sm text-gray-500">Customer not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Link to="/account/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={16} /> Back to customers
      </Link>

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
        <h2 className="text-lg font-semibold mb-3">Pets</h2>
        {pets.length === 0 ? (
          <p className="text-sm text-gray-400">No pets recorded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pets.map((pet) => (
              <div key={pet.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium">{pet.name}</p>
                <p className="text-xs text-gray-500">
                  {[pet.breed, pet.age && `${pet.age}y`, pet.weight && `${pet.weight}kg`].filter(Boolean).join(' · ')}
                </p>
                {pet.notes && <p className="text-xs text-gray-500 mt-1">{pet.notes}</p>}
              </div>
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
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.services?.name || 'Service'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {b.pets?.name && ` · ${b.pets.name}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-600'}`}>
                  {b.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Notes</h2>
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
          Coming soon — leave a note for this customer that only you can see.
        </div>
      </section>
    </div>
  )
}
