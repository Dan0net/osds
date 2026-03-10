/**
 * Resolve walker slug from subdomain or /w/:walker path.
 * In production: extract from Host header (e.g. ellie.onestopdog.shop → "ellie")
 * In dev: use /w/:walker path param as fallback.
 */
export function resolveWalker(hostname, pathParam) {
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    if (sub !== 'www') return sub
  }
  return pathParam || null
}
