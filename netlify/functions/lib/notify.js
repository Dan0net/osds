import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import webpush from 'web-push'
import { getOrCreateConversation } from './conversations.js'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Dev fallback: when Resend isn't configured but SMTP_HOST is, route emails
// through a local SMTP server (e.g. Mailpit on localhost:1025) so they show
// up alongside Supabase auth emails during development.
const smtpTransport = (!resend && process.env.SMTP_HOST)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false,
      ignoreTLS: true,
    })
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

export { emailTemplate, esc } from './email-template.js'

/**
 * Send an email via Resend (production) or a local SMTP relay (dev). Best-effort — never throws.
 */
async function sendEmail(to, subject, html) {
  const from = 'One Stop Dog Shop <notifications@onestopdog.shop>'
  try {
    if (resend) {
      await resend.emails.send({ from, to, subject, html })
    } else if (smtpTransport) {
      await smtpTransport.sendMail({ from, to, subject, html })
    } else {
      console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`)
    }
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

export { sendEmail }

/**
 * Send a system message + email + push for a booking lifecycle event.
 * Inserts a `kind=system` row into the conversation between the walker and the
 * client, then delivers email + push to the recipient based on their prefs.
 *
 * Best-effort — never throws, never blocks the caller's response.
 *
 * @param {object} supabase - Admin supabase client (service role)
 * @param {object} args
 * @param {string} args.walkerId - walker_profiles.id
 * @param {string} args.clientId - users.id of the client
 * @param {string} args.recipientUserId - users.id who receives the email/push (the other party)
 * @param {object} args.event - { type, title, body, link, emailSubject, emailHtml }
 */
export async function notify(supabase, { walkerId, clientId, recipientUserId, event }) {
  try {
    const conversationId = await getOrCreateConversation(supabase, walkerId, clientId)
    if (conversationId) {
      const body = event.body || event.title || ''
      // System message link defaults to the conversation itself when none provided.
      const link = event.link || `/account/messages/${conversationId}`
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_user_id: null,
        kind: 'system',
        event_type: event.type,
        body,
        link,
      })
    }

    if (!recipientUserId) return

    // Fetch recipient preferences
    const { data: user } = await supabase
      .from('users')
      .select('email, name, notification_preferences')
      .eq('id', recipientUserId)
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
      await sendPushToUser(supabase, recipientUserId, {
        title: event.title,
        body: event.body || '',
        url: event.link || (conversationId ? `/account/messages/${conversationId}` : '/account/messages'),
      })
    }
  } catch (err) {
    console.error('Notification failed:', err.message)
  }
}
