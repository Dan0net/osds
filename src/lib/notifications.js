export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

export function notifyNewMessage({ title, body, conversationId }) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, { body, tag: `conversation-${conversationId}` })
  n.onclick = () => {
    window.focus()
    window.location.href = `/account/messages/${conversationId}`
    n.close()
  }
}
