import { useRef, useState } from 'react'
import { Send } from 'lucide-react'

export default function MessageComposer({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const taRef = useRef(null)

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 5 * 20 + 16) + 'px'
  }

  async function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setValue('')
      if (taRef.current) {
        taRef.current.style.height = 'auto'
        taRef.current.focus()
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 bg-white border-t border-gray-200 px-3 pt-2 pb-5 lg:pb-2">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); autoGrow(e.target) }}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Message…"
        disabled={disabled}
        className="flex-1 resize-none outline-none border border-gray-200 rounded-2xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-indigo-400 max-h-[120px] disabled:opacity-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!value.trim() || sending || disabled}
        aria-label="Send"
        className="cursor-pointer shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={18} />
      </button>
    </div>
  )
}
