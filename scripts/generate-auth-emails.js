#!/usr/bin/env node

/**
 * Generate branded Supabase auth email templates from the shared emailTemplate().
 *
 * Usage: node scripts/generate-auth-emails.js
 *
 * Writes HTML files to supabase/templates/ — these are checked into git
 * and deployed via `npm run deploy:emails`.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { emailTemplate } from '../netlify/functions/lib/email-template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'supabase', 'templates')

mkdirSync(outDir, { recursive: true })

const supabaseUrl = '{{ .SiteURL }}'
const confirmUrl = '{{ .ConfirmationURL }}'

const templates = [
  {
    file: 'confirmation.html',
    title: 'Confirm your email',
    body: [
      'Thanks for signing up to One Stop Dog Shop! Click the button below to verify your email address and activate your account.',
    ],
    cta: 'Confirm email',
    footer: 'You received this email because an account was created with this address.',
  },
  {
    file: 'recovery.html',
    title: 'Reset your password',
    body: [
      'We received a request to reset your password. Click the button below to choose a new one.',
    ],
    cta: 'Reset password',
    footer: 'You received this email because a password reset was requested for your account.',
  },
  {
    file: 'magic_link.html',
    title: 'Your login link',
    body: [
      'Click the button below to log in to your One Stop Dog Shop account. This link expires in 24 hours.',
    ],
    cta: 'Log in',
    footer: 'You received this email because a login was requested for your account.',
  },
  {
    file: 'email_change.html',
    title: 'Confirm email change',
    body: [
      'Click the button below to confirm changing your email address to this one.',
    ],
    cta: 'Confirm change',
    footer: 'You received this email because an email change was requested for your account.',
  },
]

for (const t of templates) {
  // Add "if you didn't request this" line
  const body = [...t.body]
  if (t.file === 'email_change.html') {
    body.push('If you didn\'t request this change, please secure your account immediately.')
  } else {
    body.push('If you didn\'t ' + (t.file === 'confirmation.html' ? 'create this account' : 'request this') + ', you can safely ignore this email.' + (t.file === 'recovery.html' ? ' Your password will remain unchanged.' : ''))
  }

  const footerHtml = `<p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">${t.footer}</p>`
  const html = emailTemplate(t.title, body, t.cta, confirmUrl, footerHtml, { siteUrl: supabaseUrl })

  writeFileSync(resolve(outDir, t.file), html + '\n')
  console.log(`Generated: supabase/templates/${t.file}`)
}

console.log('Done.')
