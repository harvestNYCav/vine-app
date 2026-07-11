import type { Client } from '@libsql/client'

export function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nextSaturday(from: Date = new Date()): string {
  const date = new Date(from)
  do {
    date.setDate(date.getDate() + 1)
  } while (date.getDay() !== 6)
  return date.toISOString().slice(0, 10)
}

export async function getTaughtModuleSlugsForStudent(db: Client, studentId: string): Promise<Set<string>> {
  const result = await db.execute({
    sql: 'SELECT DISTINCT module_slug FROM sessions WHERE student_id = ? AND date <= ?',
    args: [studentId, todayString()],
  })
  return new Set(result.rows.map(row => String(row.module_slug)))
}
