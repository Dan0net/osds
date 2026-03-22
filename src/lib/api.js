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

// Stripe Connect
export const stripeConnectOnboard = () =>
  apiFetch('stripe-connect-onboard', { method: 'POST' })

export const stripeConnectCallback = () =>
  apiFetch('stripe-connect-callback', { method: 'POST' })

export const stripeDashboardLink = () =>
  apiFetch('stripe-dashboard-link', { method: 'POST' })

// Checkout
export const createCheckout = (paymentId) =>
  apiFetch('create-checkout', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  })

// Cancel / Reschedule
export const cancelBooking = (params) =>
  apiFetch('cancel-booking', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const rescheduleBooking = (params) =>
  apiFetch('reschedule-booking', {
    method: 'POST',
    body: JSON.stringify(params),
  })

// Walker create booking
export const walkerCreateBooking = (params) =>
  apiFetch('walker-create-booking', {
    method: 'POST',
    body: JSON.stringify(params),
  })
