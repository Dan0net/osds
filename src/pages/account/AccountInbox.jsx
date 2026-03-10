export default function AccountInbox() {
  const notifications = [
    { id: 1, message: 'Dan requested a 30-Minute Walk on 12 Mar', time: '2 hours ago', read: false },
    { id: 2, message: 'Dan requested a Bath & Groom on 14 Mar', time: '2 hours ago', read: false },
    { id: 3, message: "Your booking with James's Paw Patrol is confirmed", time: '1 day ago', read: true },
    { id: 4, message: 'Payment received from Dan — £25.00', time: '3 days ago', read: true },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inbox</h1>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-white border rounded-lg p-4 flex items-start justify-between ${
              n.read ? 'border-gray-200' : 'border-indigo-300 bg-indigo-50'
            }`}
          >
            <div>
              {!n.read && (
                <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full mr-2 mt-1" />
              )}
              <span className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                {n.message}
              </span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
