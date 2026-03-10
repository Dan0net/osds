const BASE = '/.netlify/functions'

export async function apiFetch(fn, options = {}) {
  const res = await fetch(`${BASE}/${fn}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}
