export const DEFAULT_PROGRAM_TIME_ZONE = 'America/New_York'

export function getProgramTimeZone(): string {
  return process.env.PROGRAM_TIME_ZONE?.trim() || DEFAULT_PROGRAM_TIME_ZONE
}

export interface CalendarDateParts {
  year: number
  month: number
  day: number
}

export function calendarDateParts(
  value: number | Date = Date.now(),
  timeZone: string = getProgramTimeZone(),
): CalendarDateParts {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = new Map(parts.map(part => [part.type, part.value]))
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
  }
}

export function localDateKey(
  value: number | Date = Date.now(),
  timeZone: string = getProgramTimeZone(),
): string {
  const { year, month, day } = calendarDateParts(value, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
