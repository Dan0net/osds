import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const [subscription, setSubscription] = useState(null)
  const [permission, setPermission] = useState('default')
  const supported = 'PushManager' in window && 'serviceWorker' in navigator

  useEffect(() => {
    if (!supported) return
    setPermission(Notification.permission)

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub)
      })
    })
  }, [])

  async function subscribe() {
    if (!supported) return null
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return null

    const reg = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.error('VITE_VAPID_PUBLIC_KEY not set')
      return null
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    setSubscription(sub)

    // Save to server
    await apiFetch('save-push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
        device_type: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop',
      }),
    })

    return sub
  }

  async function unsubscribe() {
    if (!subscription) return
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    setSubscription(null)

    await apiFetch('save-push-subscription', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    })
  }

  return { subscription, supported, permission, subscribe, unsubscribe }
}
