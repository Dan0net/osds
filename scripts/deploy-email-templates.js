#!/usr/bin/env node

/**
 * Deploy branded email templates to hosted Supabase project via the Management API.
 *
 * Required env vars:
 *   SUPABASE_PROJECT_REF  — project reference (from dashboard URL)
 *   SUPABASE_ACCESS_TOKEN — personal access token (supabase.com/dashboard/account/tokens)
 *
 * Usage:
 *   node scripts/deploy-email-templates.js
 *   # or via npm:
 *   npm run deploy:emails
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!projectRef || !accessToken) {
  console.error('Missing required env vars: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN')
  console.error('Get your access token at: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

function readTemplate(name) {
  return readFileSync(resolve(root, 'supabase/templates', name), 'utf-8')
}

const payload = {
  mailer_templates_confirmation_content: readTemplate('confirmation.html'),
  mailer_subjects_confirmation: 'Confirm your email — One Stop Dog Shop',
  mailer_templates_recovery_content: readTemplate('recovery.html'),
  mailer_subjects_recovery: 'Reset your password — One Stop Dog Shop',
  mailer_templates_magic_link_content: readTemplate('magic_link.html'),
  mailer_subjects_magic_link: 'Your login link — One Stop Dog Shop',
  mailer_templates_email_change_content: readTemplate('email_change.html'),
  mailer_subjects_email_change: 'Confirm email change — One Stop Dog Shop',
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify(payload),
})

if (!res.ok) {
  const body = await res.text()
  console.error(`Failed to deploy email templates (${res.status}):`, body)
  process.exit(1)
}

console.log('Email templates deployed successfully to Supabase project:', projectRef)
