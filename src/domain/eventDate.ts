interface ParsedEventDate {
  date: Date
  dateKey: string
  hasTime: boolean
}

function parseEventDate(value: string): ParsedEventDate | null {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})(?:T(\d{2}):?(\d{2})(?::?(\d{2}))?)?(Z)?$/.exec(value.trim())
  if (!match) return null

  const [, year, month, day, hour = '0', minute = '0', second = '0', utc] = match
  const parts = [Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)] as const
  const date = utc ? new Date(Date.UTC(...parts)) : new Date(...parts)
  if (Number.isNaN(date.getTime())) return null

  return {
    date,
    dateKey: `${year}-${month}-${day}`,
    hasTime: Boolean(match[4]),
  }
}

function formatTime(parsed: ParsedEventDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(parsed.date)
}

function formatDate(parsed: ParsedEventDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed.date)
}

export function compactEventDate(value: string, locale: string): { month: string; day: string; time: string } {
  const parsed = parseEventDate(value)
  if (!parsed) return { month: 'EVENT', day: '•', time: value }

  return {
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(parsed.date).toUpperCase(),
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(parsed.date),
    time: parsed.hasTime ? formatTime(parsed, locale) : '',
  }
}

export function formatEventDateTime(value: string, locale: string): string {
  const parsed = parseEventDate(value)
  if (!parsed) return value
  return parsed.hasTime ? `${formatDate(parsed, locale)}, ${formatTime(parsed, locale)}` : formatDate(parsed, locale)
}

export function formatEventRange(start: string, end: string, locale: string): string {
  const parsedStart = parseEventDate(start)
  if (!parsedStart) return [start, end].filter(Boolean).join(' – ')
  if (!parsedStart.hasTime) return formatDate(parsedStart, locale)

  const parsedEnd = parseEventDate(end)
  const startTime = formatTime(parsedStart, locale)
  if (!parsedEnd) return startTime
  if (parsedEnd.hasTime && parsedEnd.dateKey === parsedStart.dateKey) {
    return `${startTime} – ${formatTime(parsedEnd, locale)}`
  }
  return `${formatEventDateTime(start, locale)} – ${formatEventDateTime(end, locale)}`
}
