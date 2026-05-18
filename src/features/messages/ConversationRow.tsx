import { format, isToday, isYesterday, parseISO } from 'date-fns'
import ListItem from '@/shared/list/ListItem'
import Avatar from '@/shared/Avatar'

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'd MMM')
}

export default function ConversationRow({ conversation, counterpartyName, avatarUrl, preview, unreadCount }) {
  const hasUnread = unreadCount > 0

  return (
    <ListItem to={`/account/messages/${conversation.id}`}>
      <Avatar src={avatarUrl} name={counterpartyName} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
          {counterpartyName || 'Unknown'}
        </p>
        <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
          {preview || 'No messages yet'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[11px] ${hasUnread ? 'font-medium' : 'text-gray-400'}`}>
          {formatTimestamp(conversation.last_message_at)}
        </span>
        {hasUnread && (
          <span className="bg-indigo-600 text-white text-[11px] font-semibold leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </ListItem>
  )
}
