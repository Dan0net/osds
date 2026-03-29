import { Resend } from 'resend'
import webpush from 'web-push'
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@onestopdog.shop',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

/**
 * Format a YYYY-MM-DD date string as "Friday 26th April"
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const suffix = date === 1 || date === 21 || date === 31 ? 'st'
    : date === 2 || date === 22 ? 'nd'
    : date === 3 || date === 23 ? 'rd' : 'th'
  return `${day} ${date}${suffix} ${month}`
}

/**
 * Format a date + time: "Friday 26th April at 15:00"
 */
export function formatDateTime(dateStr, timeStr) {
  const formatted = formatDate(dateStr)
  return timeStr ? `${formatted} at ${timeStr.slice(0, 5)}` : formatted
}

/**
 * Format multiple slots: "Friday 26th April at 15:00 (+2 more)"
 */
export function formatSlots(slots) {
  if (!slots || slots.length === 0) return ''
  const first = formatDateTime(slots[0].date, slots[0].time)
  if (slots.length === 1) return first
  return `${first} (+${slots.length - 1} more)`
}

// Map event type to notification preference keys
const PREF_MAP = {
  booking_request: { email: 'email_new_request', push: 'push_new_request' },
  booking_approved: { email: 'email_approval', push: 'push_approval' },
  booking_declined: { email: 'email_approval', push: 'push_approval' },
  booking_cancelled: { email: 'email_cancellation', push: 'push_cancellation' },
  booking_rescheduled: { email: 'email_cancellation', push: 'push_cancellation' },
  payment_confirmed: { email: 'email_new_request', push: 'push_new_request' },
  booking_confirmed: { email: 'email_approval', push: 'push_approval' },
  booking_payment_link: { email: 'email_approval', push: 'push_approval' },
}

export { emailTemplate } from './email-template.js'

/**
 * Send an email via Resend. Best-effort — never throws.
 */
async function sendEmail(to, subject, html) {
  if (!resend) return
  try {
    await resend.emails.send({
      from: 'One Stop Dog Shop <notifications@onestopdog.shop>',
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Email send failed:', err.message)
  }
}

/**
 * Send push notification to all devices for a user. Best-effort — never throws.
 * Cleans up stale subscriptions (410 Gone).
 */
async function sendPushToUser(supabase, userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        )
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Push send failed:', err.message)
        }
      }
    }
  } catch (err) {
    console.error('Push lookup failed:', err.message)
  }
}

/**
 * Send a notification to a user. Inserts into inbox, sends email + push based on preferences.
 * Best-effort — never throws, never blocks the caller's response.
 *
 * @param {object} supabase - Admin supabase client (service role)
 * @param {string} userId - Target user ID
 * @param {object} event - { type, title, body, link, emailSubject, emailHtml }
 */
export async function notify(supabase, userId, event) {
  try {
    // Insert notification into inbox
    await supabase.from('notifications').insert({
      user_id: userId,
      type: event.type,
      title: event.title,
      body: event.body || '',
      link: event.link || null,
    })

    // Fetch user preferences
    const { data: user } = await supabase
      .from('users')
      .select('email, name, notification_preferences')
      .eq('id', userId)
      .single()

    if (!user) return

    const prefs = user.notification_preferences || {}
    const prefKeys = PREF_MAP[event.type]
    if (!prefKeys) return

    // Send email if enabled
    if (prefs[prefKeys.email] !== false && event.emailSubject && event.emailHtml) {
      await sendEmail(user.email, event.emailSubject, event.emailHtml)
    }

    // Send push if enabled
    if (prefs[prefKeys.push] !== false) {
      await sendPushToUser(supabase, userId, {
        title: event.title,
        body: event.body || '',
        url: event.link || '/account/inbox',
      })
    }
  } catch (err) {
    console.error('Notification failed:', err.message)
  }
}
