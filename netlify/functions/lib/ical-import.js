import dns from 'dns/promises'
import ical from 'node-ical'

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
    // Resolve IPv4
    try {
      const addresses = await dns.resolve4(hostname)
      if (addresses.some(isPrivateIP)) return 'URL resolves to a private IP address'
    } catch {
      // No A record — try AAAA
    }
    // Resolve IPv6
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

function addEvent(events, uid, title, start, end, allDay, today, windowEnd) {
  if (allDay) {
    const endDate = end || new Date(start.getTime() + 24 * 60 * 60 * 1000)
    for (let d = new Date(start); d < endDate; d.setDate(d.getDate() + 1)) {
      if (d < today || d >= windowEnd) continue
      events.push({
        id: `${uid}-${toDateStr(d)}`,
        title,
        date: toDateStr(d),
        start_time: null,
        end_time: null,
        allDay: true,
      })
    }
  } else {
    const effectiveEnd = end || new Date(start.getTime() + 60 * 60 * 1000)

    if (toDateStr(start) === toDateStr(effectiveEnd) || !end) {
      if (start >= today && start < windowEnd) {
        events.push({
          id: `${uid}-${toDateStr(start)}`,
          title,
          date: toDateStr(start),
          start_time: toTimeStr(start),
          end_time: toTimeStr(effectiveEnd),
          allDay: false,
        })
      }
    } else {
      for (let d = new Date(start); d < effectiveEnd; d.setDate(d.getDate() + 1)) {
        if (d < today || d >= windowEnd) continue
        const dayStart = toDateStr(d) === toDateStr(start) ? toTimeStr(start) : '00:00'
        const dayEnd = toDateStr(d) === toDateStr(effectiveEnd) ? toTimeStr(effectiveEnd) : '23:59'
        events.push({
          id: `${uid}-${toDateStr(d)}`,
          title,
          date: toDateStr(d),
          start_time: dayStart,
          end_time: dayEnd,
          allDay: false,
        })
      }
    }
  }
}

function parseIcsEvents(rawText) {
  const parsed = ical.parseICS(rawText)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS)

  const events = []

  // Collect exdates (cancelled occurrences) per UID
  const exdates = {}
  for (const [, item] of Object.entries(parsed)) {
    if (item.type !== 'VEVENT' || !item.exdate) continue
    const uid = item.uid
    if (!exdates[uid]) exdates[uid] = new Set()
    for (const [, exd] of Object.entries(item.exdate)) {
      const d = exd instanceof Date ? exd : new Date(exd)
      if (!isNaN(d.getTime())) exdates[uid].add(toDateStr(d))
    }
  }

  for (const [, item] of Object.entries(parsed)) {
    if (item.type !== 'VEVENT') continue
    if (item.status === 'CANCELLED') continue
    if (item.transparency === 'TRANSPARENT') continue

    const start = item.start instanceof Date ? item.start : new Date(item.start)
    const end = item.end instanceof Date ? item.end : (item.end ? new Date(item.end) : null)

    if (isNaN(start.getTime())) continue

    const allDay = item.start?.dateOnly === true ||
      (item.datetype === 'date') ||
      (start.getHours() === 0 && start.getMinutes() === 0 && end &&
       end.getHours() === 0 && end.getMinutes() === 0 &&
       (end - start) % (24 * 60 * 60 * 1000) === 0)

    const title = item.summary || 'Busy'
    const uid = item.uid || `evt-${start.getTime()}`
    const duration = end ? end.getTime() - start.getTime() : (allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)
    const uidExdates = exdates[item.uid] || new Set()

    if (item.rrule) {
      // Recurring event — expand occurrences within window
      const occurrences = item.rrule.between(today, windowEnd, true)
      for (const occ of occurrences) {
        if (uidExdates.has(toDateStr(occ))) continue
        const occEnd = new Date(occ.getTime() + duration)
        addEvent(events, `${uid}-r`, title, occ, occEnd, allDay, today, windowEnd)
      }
    } else {
      // One-off event
      if (!uidExdates.has(toDateStr(start))) {
        addEvent(events, uid, title, start, end, allDay, today, windowEnd)
      }
    }
  }

  return events
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

  // Fetch all imports in parallel
  const results = await Promise.all(
    imports.map((imp) => fetchAndParseSingle(supabase, imp))
  )

  for (const { events, error } of results) {
    if (events.length > 0) allEvents.push(...events)
    if (error) allErrors.push(error)
  }

  return { events: allEvents, errors: allErrors }
}
