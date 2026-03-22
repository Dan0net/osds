import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { stripeDashboardLink } from '../../lib/api'

const STATUS_COLORS = {
  pending_approval: 'bg-yellow-100 text-yellow-700',
  awaiting_payment: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
  partially_refunded: 'bg-orange-100 text-orange-700',
}

export default function AccountPayments() {
  const { user, walkerProfile: wp } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      // Payments as client
      const { data: clientPayments } = await supabase
        .from('payments')
        .select('*, walker_profiles(business_name)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      // Payments as walker
      let walkerPayments = []
      if (wp) {
        const { data } = await supabase
          .from('payments')
          .select('*, users!payments_client_id_fkey(name)')
          .eq('walker_id', wp.id)
          .order('created_at', { ascending: false })
        walkerPayments = data || []
      }

      const merged = [
        ...(clientPayments || []).map((p) => ({
          ...p,
          type: 'paid',
          counterpart: p.walker_profiles?.business_name || 'Walker',
        })),
        ...walkerPayments.map((p) => ({
          ...p,
          type: 'received',
          counterpart: p.users?.name || 'Client',
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setPayments(merged)
      setLoading(false)
    }
    load()
  }, [user?.id, wp?.id])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Payments</h1>
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payments</h1>

      {payments.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No payments yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          {payments.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.counterpart}</p>
                <p className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="mx-1">·</span>
                  {p.source}
                  <span className="mx-1">·</span>
                  <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.status.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
              <span className={`font-semibold ${p.type === 'received' ? 'text-green-600' : 'text-gray-900'}`}>
                {p.type === 'received' ? '+' : '−'}£{(p.total_cents / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {wp && (
        <div className="mt-6">
          <button
            onClick={async () => {
              const res = await stripeDashboardLink()
              if (res.data?.url) window.open(res.data.url, '_blank')
            }}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Open Stripe Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
