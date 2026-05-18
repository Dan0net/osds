import dns from 'dns/promises'
import IcalExpander from 'ical-expander'

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const PROBE_THROTTLE_MS = 30 * 1000 // per-walker server-side dedupe window
const FETCH_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 10_000_000 // 10MB
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

/**
 * Drop VEVENT blocks whose DTSTART is before `cutoffISO` AND have no RRULE
 * AND no RECURRENCE-ID. Reduces what `IcalExpander.between()` has to expand —
 * for a 10MB Google feed full of years of past events, this is a 10-50x
 * shrink before parse. Conservative: keep the block if anything looks
 * recurring or unparseable.
 */
function trimPastEvents(icsText, cutoffISO) {
  const lines = icsText.split(/\r?\n/)
  const out = []
  let buf = null, dtstart = null, hasRrule = false, hasRecurId = false
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      buf = [line]
      dtstart = null
      hasRrule = false
      hasRecurId = false
      continue
    }
    if (!buf) {
      out.push(line)
      continue
    }
    buf.push(line)
    if (line.startsWith('DTSTART')) {
      const m = line.match(/(\d{8})/)
      if (m) dtstart = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`
    } else if (line.startsWith('RRULE')) {
      hasRrule = true
    } else if (line.startsWith('RECURRENCE-ID')) {
      hasRecurId = true
    } else if (line.startsWith('END:VEVENT')) {
      const past = dtstart && dtstart < cutoffISO
      const drop = past && !hasRrule && !hasRecurId
      if (!drop) out.push(...buf)
      buf = null
    }
  }
  return out.join('\n')
}

function parseIcsEvents(rawText) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffISO = cutoff.toISOString().slice(0, 10)

  const trimmed = trimPastEvents(rawText, cutoffISO)
  const cleaned = preprocessIcs(trimmed)

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
 * Validate and fetch an iCal URL. Returns one of:
 *   { rawText, lastModified } — fresh body
 *   { notModified: true }     — 304 response (only when `lastModified` passed in)
 *   { error }                 — validation or fetch failure
 * Used both for upfront validation (before saving) and for cache-miss fetches.
 */
export async function fetchIcalUrl(url, { lastModified } = {}) {
  const validationError = await validateUrl(url)
  if (validationError) return { error: validationError }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const headers = { 'Accept': 'text/calendar' }
    if (lastModified) headers['If-Modified-Since'] = lastModified

    const res = await fetch(url, { signal: controller.signal, headers })
    clearTimeout(timeout)

    if (res.status === 304) return { notModified: true }
    if (!res.ok) return { error: `HTTP ${res.status}` }

    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
      return { error: 'Response too large' }
    }

    const rawText = await res.text()
    if (rawText.length > MAX_BODY_BYTES) {
      return { error: 'Response too large' }
    }

    if (!rawText.trimStart().startsWith('BEGIN:VCALENDAR')) {
      return { error: 'URL did not return calendar data. Use the "Secret address in iCal format" (ending in .ics), not a sharing or web link.' }
    }

    return { rawText, lastModified: res.headers.get('last-modified') || null }
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'Request timed out' : err.message }
  }
}

async function refreshCacheSingle(supabase, importRow) {
  const { data: existing } = await supabase
    .from('ical_cache')
    .select('events_json, last_modified')
    .eq('import_id', importRow.id)
    .maybeSingle()

  const result = await fetchIcalUrl(importRow.url, { lastModified: existing?.last_modified })

  if (result.error) {
    return { events: existing?.events_json || [], error: `${importRow.label}: ${result.error}`, changed: false }
  }

  if (result.notModified) {
    await supabase
      .from('ical_cache')
      .update({ fetched_at: new Date().toISOString() })
      .eq('import_id', importRow.id)
    return { events: existing?.events_json || [], error: null, changed: false }
  }

  let events
  try {
    events = parseIcsEvents(result.rawText)
  } catch {
    return { events: [], error: `${importRow.label}: Failed to parse calendar data`, changed: false }
  }

  const changed = JSON.stringify(events) !== JSON.stringify(existing?.events_json || [])

  await supabase
    .from('ical_cache')
    .upsert({
      import_id: importRow.id,
      events_json: events,
      last_modified: result.lastModified,
      fetched_at: new Date().toISOString(),
    })

  return { events, error: null, changed }
}

async function fetchAndParseSingle(supabase, importRow, { allowStale = false } = {}) {
  const { data: cached } = await supabase
    .from('ical_cache')
    .select('events_json, fetched_at')
    .eq('import_id', importRow.id)
    .single()

  const isFresh = cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS

  if (isFresh) {
    return { events: cached.events_json, error: null, changed: false }
  }

  // Stale cache available — return it immediately and refresh in background
  if (allowStale && cached) {
    refreshCacheSingle(supabase, importRow).catch(() => {})
    return { events: cached.events_json, error: null, changed: false }
  }

  // No cache or not in stale-ok mode — fetch synchronously
  return refreshCacheSingle(supabase, importRow)
}

/**
 * Fetch and merge external calendar events for a walker from all their imports.
 * Returns { events: [...], errors: [...] }
 */
export async function fetchExternalEvents(supabase, walkerId, { allowStale = false } = {}) {
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
    imports.map((imp) => fetchAndParseSingle(supabase, imp, { allowStale }))
  )

  for (const { events, error } of results) {
    if (events.length > 0) allEvents.push(...events)
    if (error) allErrors.push(error)
  }

  return { events: allEvents, errors: allErrors }
}

/**
 * On-demand probe for a walker's calendars. Throttled per-walker via
 * walker_profiles.last_external_probe_at — concurrent calls within
 * PROBE_THROTTLE_MS collapse to one external fetch.
 *
 * Bumps walker_profiles.external_events_updated_at only when content
 * actually changed (drives FE realtime invalidation).
 */
export async function probeWalkerCalendars(supabase, walkerId) {
  const { data: walker } = await supabase
    .from('walker_profiles')
    .select('last_external_probe_at')
    .eq('id', walkerId)
    .single()

  if (walker?.last_external_probe_at) {
    const sinceLast = Date.now() - new Date(walker.last_external_probe_at).getTime()
    if (sinceLast < PROBE_THROTTLE_MS) {
      return { throttled: true, changed: false, errors: [] }
    }
  }

  const now = new Date().toISOString()
  await supabase
    .from('walker_profiles')
    .update({ last_external_probe_at: now })
    .eq('id', walkerId)

  const { data: imports } = await supabase
    .from('ical_imports')
    .select('*')
    .eq('walker_id', walkerId)

  if (!imports || imports.length === 0) {
    return { throttled: false, changed: false, errors: [] }
  }

  const errors = []
  let anyChanged = false

  const results = await Promise.all(imports.map((imp) => refreshCacheSingle(supabase, imp)))
  for (const r of results) {
    if (r.error) errors.push(r.error)
    if (r.changed) anyChanged = true
  }

  if (anyChanged) {
    await supabase
      .from('walker_profiles')
      .update({ external_events_updated_at: new Date().toISOString() })
      .eq('id', walkerId)
  }

  return { throttled: false, changed: anyChanged, errors }
}
