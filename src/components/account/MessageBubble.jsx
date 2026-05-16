import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react'

export default function MessageBubble({ message, isSelf }) {
  if (message.kind === 'system') return <SystemMessage message={message} />

  const time = message.created_at ? format(parseISO(message.created_at), 'HH:mm') : ''
  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
          isSelf
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        {message.body}
      </div>
      <span className="text-[11px] text-gray-400 mt-0.5 px-1">{time}</span>
    </div>
  )
}

function SystemMessage({ message }) {
  const inner = (
    <>
      <span>{message.body}</span>
      {message.link && <ChevronRight size={14} className="text-gray-400" />}
    </>
  )
  const className = 'inline-flex items-center gap-1 max-w-[90%] bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1.5'
  return (
    <div className="flex justify-center">
      {message.link ? (
        <Link to={message.link} className={`${className} hover:bg-gray-200 transition`}>
          {inner}
        </Link>
      ) : (
        <span className={className}>{inner}</span>
      )}
    </div>
  )
}
