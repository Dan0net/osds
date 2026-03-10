import { MOCK_USER } from '../../lib/mockData'

export default function AccountPayments() {
  const payments = [
    { id: 'pay-1', date: '2026-03-08', description: '60-Minute Walk — Dan', amount_cents: 2500, source: 'stripe', type: 'received' },
    { id: 'pay-2', date: '2026-03-13', description: "Group Walk — James's Paw Patrol", amount_cents: 1200, source: 'stripe', type: 'paid' },
    { id: 'pay-3', date: '2026-03-05', description: '30-Minute Walk — Dan', amount_cents: 1500, source: 'cash', type: 'received' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payments</h1>

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {payments.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{p.description}</p>
              <p className="text-xs text-gray-400">
                {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span className="mx-1">·</span>
                {p.source}
              </p>
            </div>
            <span className={`font-semibold ${p.type === 'received' ? 'text-green-600' : 'text-gray-900'}`}>
              {p.type === 'received' ? '+' : '−'}£{(p.amount_cents / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {MOCK_USER.has_walker_profile && (
        <div className="mt-6">
          <button className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50">
            Open Stripe Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
