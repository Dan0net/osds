import { supabase } from './supabase'

const BASE = '/.netlify/functions'

export async function apiFetch(fn, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(`${BASE}/${fn}`, {
    headers,
    ...options,
  })
  return res.json()
}
