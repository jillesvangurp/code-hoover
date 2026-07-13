import { describe, expect, it } from 'vitest'
import { compactEventDate, formatEventDateTime, formatEventRange } from './eventDate'

describe('event date display', () => {
  it('formats compact ICS start and end values as a time range', () => {
    expect(formatEventRange('20260720T090000', '20260720T100000', 'en-GB')).toBe('09:00 – 10:00')
  })

  it('formats compact event dates for the calendar panel', () => {
    expect(compactEventDate('20260720T090000', 'en-GB')).toEqual({ month: 'JUL', day: '20', time: '09:00' })
  })

  it('keeps dates readable when an event spans more than one day', () => {
    expect(formatEventDateTime('20260721T103000', 'en-GB')).toBe('21 Jul 2026, 10:30')
  })
})
