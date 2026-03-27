import dns from 'dns/promises'
import IcalExpander from 'ical-expander'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const FETCH_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 1_000_000 // 1MB
const WINDOW_DAYS = 30

// Private IP ranges to reject (SSRF protection)
function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length === 4) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 0) return true
  }
  // IPv6 loopback / private
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

async function validateUrl(url) {
  if (!url || !url.startsWith('https://')) {
    return 'URL must use HTTPS'
  }
  try {
    const hostname = new URL(url).hostname
    try {
      const addresses = await dns.resolve4(hostname)
      if (addresses.some(isPrivateIP)) return 'URL resolves to a private IP address'
    } catch {
      // No A record — try AAAA
    }
    try {
      const addresses = await dns.resolve6(hostname)
      if (addresses.some(isPrivateIP)) return 'URL resolves to a private IP address'
    } catch {
      // No AAAA record either is fine if A record worked
    }
    return null
  } catch {
    return 'Invalid URL'
  }
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTimeStr(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Google Calendar's public iCal feeds export recurring events as individual
 * VEVENTs with RECURRENCE-ID but no base RRULE. ical-expander drops these
 * orphaned instances. Stripping the RECURRENCE-ID lines lets them be parsed
 * as regular one-off events, which is correct for availability blocking.
 */
function preprocessIcs(icsText) {
  if (!icsText.match(/^RRULE:/m)) {
    return icsText.replace(/^RECURRENCE-ID[^\r\n]*[\r\n]+/gm, '')
  }
  return icsText
}

function parseIcsEvents(rawText) {
  const cleaned = preprocessIcs(rawText)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS)

  const expander = new IcalExpander({ ics: cleaned, maxIterations: 1000 })
  const { events, occurrences } = expander.between(today, windowEnd)

  const result = []

  // One-off events (and pre-expanded recurrence instances after preprocessing)
  for (const e of events) {
    const start = e.startDate.toJSDate()
    const end = e.endDate.toJSDate()
    const allDay = e.startDate.isDate
    const uid = e.uid || `evt-${start.getTime()}`

    if (allDay) {
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (d < today || d >= windowEnd) continue
        result.push({ id: `${uid}-${toDateStr(d)}`, title: e.summary || 'Busy', date: toDateStr(d), start_time: null, end_time: null, allDay: true })
      }
    } else {
      result.push({ id: `${uid}-${toDateStr(start)}`, title: e.summary || 'Busy', date: toDateStr(start), start_time: toTimeStr(start), end_time: toTimeStr(end), allDay: false })
    }
  }

  // RRULE-expanded recurring occurrences
  for (const o of occurrences) {
    const start = o.startDate.toJSDate()
    const end = o.endDate.toJSDate()
    const allDay = o.item.startDate.isDate
    const uid = o.item.uid || `occ-${start.getTime()}`

    if (allDay) {
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        if (d < today || d >= windowEnd) continue
        result.push({ id: `${uid}-${toDateStr(d)}`, title: o.item.summary || 'Busy', date: toDateStr(d), start_time: null, end_time: null, allDay: true })
      }
    } else {
      result.push({ id: `${uid}-${toDateStr(start)}`, title: o.item.summary || 'Busy', date: toDateStr(start), start_time: toTimeStr(start), end_time: toTimeStr(end), allDay: false })
    }
  }

  return result
}

/**
 * Validate and fetch an iCal URL. Returns { rawText } on success, { error } on failure.
 * Used both for upfront validation (before saving) and for cache-miss fetches.
 */
export async function fetchIcalUrl(url) {
  const validationError = await validateUrl(url)
  if (validationError) return { error: validationError }

  let rawText
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/calendar' },
    })
    clearTimeout(timeout)

    if (!res.ok) return { error: `HTTP ${res.status}` }

    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
      return { error: 'Response too large' }
    }

    rawText = await res.text()
    if (rawText.length > MAX_BODY_BYTES) {
      return { error: 'Response too large' }
    }

    if (!rawText.trimStart().startsWith('BEGIN:VCALENDAR')) {
      return { error: 'URL did not return calendar data. Use the "Secret address in iCal format" (ending in .ics), not a sharing or web link.' }
    }
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'Request timed out' : err.message }
  }

  return { rawText }
}

async function fetchAndParseSingle(supabase, importRow) {
  // Check cache
  const { data: cached } = await supabase
    .from('ical_cache')
    .select('events_json, fetched_at')
    .eq('import_id', importRow.id)
    .single()

  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS) {
    return { events: cached.events_json, error: null }
  }

  // Fetch and validate
  const { rawText, error: fetchError } = await fetchIcalUrl(importRow.url)
  if (fetchError) {
    return { events: [], error: `${importRow.label}: ${fetchError}` }
  }

  // Parse
  let events
  try {
    events = parseIcsEvents(rawText)
  } catch {
    return { events: [], error: `${importRow.label}: Failed to parse calendar data` }
  }

  // Upsert cache
  await supabase
    .from('ical_cache')
    .upsert({
      import_id: importRow.id,
      events_json: events,
      fetched_at: new Date().toISOString(),
    })
    .select()

  return { events, error: null }
}

/**
 * Fetch and merge external calendar events for a walker from all their imports.
 * Returns { events: [...], errors: [...] }
 */
export async function fetchExternalEvents(supabase, walkerId) {
  const { data: imports } = await supabase
    .from('ical_imports')
    .select('*')
    .eq('walker_id', walkerId)

  if (!imports || imports.length === 0) {
    return { events: [], errors: [] }
  }

  const allEvents = []
  const allErrors = []

  const results = await Promise.all(
    imports.map((imp) => fetchAndParseSingle(supabase, imp))
  )

  for (const { events, error } of results) {
    if (events.length > 0) allEvents.push(...events)
    if (error) allErrors.push(error)
  }

  return { events: allEvents, errors: allErrors }
}
