import { Link } from 'react-router-dom'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'd MMM')
}

export default function ConversationRow({ conversation, counterpartyName, avatarUrl, preview, unreadCount }) {
  const hasUnread = unreadCount > 0
  const initial = (counterpartyName?.charAt(0) || '?').toUpperCase()

  return (
    <Link
      to={`/account/messages/${conversation.id}`}
      className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
    >
      <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
          {counterpartyName || 'Unknown'}
        </p>
        <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
          {preview || 'No messages yet'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[11px] ${hasUnread ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
          {formatTimestamp(conversation.last_message_at)}
        </span>
        {hasUnread && (
          <span className="bg-indigo-600 text-white text-[11px] font-semibold leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  )
}
