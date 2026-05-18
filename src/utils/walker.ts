/**
 * Resolve walker slug from subdomain or /w/:walker path.
 * In production: extract from Host header (e.g. ellie.onestopdog.shop → "ellie")
 * In dev: use /w/:walker path param as fallback.
 */
export function resolveWalker(hostname, pathParam) {
  const parts = hostname.split('.')

  // Never treat Netlify preview/branch deploys or localhost as walker subdomains
  if (hostname.endsWith('.netlify.app') || hostname === 'localhost') {
    return pathParam || null
  }

  if (parts.length >= 3) {
    const sub = parts[0]
    if (sub !== 'www') return sub
  }
  return pathParam || null
}
