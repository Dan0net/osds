export function formatGBP(cents: number | null | undefined, opts: { smart?: boolean } = {}): string {
  if (cents == null) return ''
  const pounds = cents / 100
  if (opts.smart && Number.isInteger(pounds)) return `£${pounds}`
  return `£${pounds.toFixed(2)}`
}

type DateLike = Date | string | number

function toDate(d: DateLike): Date {
  return d instanceof Date ? d : new Date(d)
}

const LOCALE = 'en-GB'

export function formatShortDate(d: DateLike): string {
  return toDate(d).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatLongDate(d: DateLike): string {
  return toDate(d).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDayMonth(d: DateLike): string {
  return toDate(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export function formatMonthYear(d: DateLike): string {
  return toDate(d).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

export function formatWeekday(d: DateLike): string {
  return toDate(d).toLocaleDateString(LOCALE, { weekday: 'short' })
}
