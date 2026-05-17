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

/**
 * Render a list of bookings as an HTML table for inclusion in email bodies.
 * rows: [{ serviceName, date, time, endTime, endDate, isOvernight, grossCents }]
 */
export function bookingsListHtml(rows) {
  if (!rows || rows.length === 0) return ''
  const { esc: escFn } = { esc: (v) => (v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')) }
  const items = rows.map((r) => {
    const dateStr = formatDate(r.date)
    let timeStr = ''
    if (r.isOvernight && r.endDate) {
      const endDateStr = formatDate(r.endDate)
      timeStr = `${(r.time || '').slice(0, 5)} → ${endDateStr} ${(r.endTime || '').slice(0, 5)}`.trim()
    } else if (r.time && r.endTime) {
      timeStr = `${r.time.slice(0, 5)}–${r.endTime.slice(0, 5)}`
    } else if (r.time) {
      timeStr = r.time.slice(0, 5)
    }
    const price = r.grossCents != null ? `£${(r.grossCents / 100).toFixed(2)}` : ''
    return `<tr>
      <td style="padding:10px 8px 10px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6"><div style="font-weight:600;color:#111827">${escFn(r.serviceName || 'Service')}</div><div style="font-size:12px;color:#6b7280;margin-top:2px">${escFn(dateStr)}${timeStr ? ' · ' + escFn(timeStr) : ''}</div></td>
      <td style="padding:10px 0;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;vertical-align:top">${escFn(price)}</td>
    </tr>`
  }).join('')
  const total = rows.reduce((sum, r) => sum + (r.grossCents || 0), 0)
  const totalRow = `<tr><td style="padding:12px 0 0;font-size:13px;color:#6b7280">Total</td><td style="padding:12px 0 0;font-size:15px;color:#111827;text-align:right;font-weight:700">£${(total / 100).toFixed(2)}</td></tr>`
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 4px"><tbody>${items}${totalRow}</tbody></table>`
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
  chat_message: { email: 'email_chat_message', push: 'push_chat_message' },
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

export { sendEmail, sendPushToUser }

/**
 * Deliver email + web push for a new chat message. Best-effort — never throws.
 * Email defaults OFF (opt-in), push defaults ON (opt-out).
 */
export async function notifyChatMessage(supabase, { recipientUserId, senderName, preview, conversationId }) {
  if (!recipientUserId) return
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, notification_preferences')
      .eq('id', recipientUserId)
      .single()
    if (!user) return

    const prefs = user.notification_preferences || {}
    const url = `/account/messages/${conversationId}`
    const body = preview || ''

    if (prefs.push_chat_message !== false) {
      await sendPushToUser(supabase, recipientUserId, { title: senderName, body, url })
    }

    if (prefs.email_chat_message === true && user.email) {
      const { emailTemplate, esc } = await import('./email-template.js')
      const html = emailTemplate(
        `New message from ${esc(senderName)}`,
        [`<p style="white-space:pre-wrap">${esc(body)}</p>`],
        'Reply',
        `${process.env.SITE_URL || 'https://onestopdog.shop'}${url}`,
      )
      await sendEmail(user.email, `New message from ${senderName}`, html)
    }
  } catch (err) {
    console.error('notifyChatMessage failed:', err.message)
  }
}

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
