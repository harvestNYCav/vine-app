import type { Client } from '@libsql/client'
import { calendarDateParts, getProgramTimeZone, localDateKey } from './dates'

export function todayString(
  value: number | Date = Date.now(),
  timeZone: string = getProgramTimeZone(),
): string {
  return localDateKey(value, timeZone)
}

export function nextSaturday(
  from: Date = new Date(),
  timeZone: string = getProgramTimeZone(),
): string {
  const { year, month, day } = calendarDateParts(from, timeZone)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  const daysUntilSaturday = (6 - calendarDate.getUTCDay() + 7) % 7 || 7
  calendarDate.setUTCDate(calendarDate.getUTCDate() + daysUntilSaturday)
  return [
    calendarDate.getUTCFullYear(),
    String(calendarDate.getUTCMonth() + 1).padStart(2, '0'),
    String(calendarDate.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export async function getTaughtModuleSlugsForStudent(db: Client, studentId: string): Promise<Set<string>> {
  const result = await db.execute({
    sql: 'SELECT DISTINCT module_slug FROM sessions WHERE student_id = ? AND date <= ?',
    args: [studentId, todayString()],
  })
  return new Set(result.rows.map(row => String(row.module_slug)))
}
