import type { Client } from '@libsql/client'

export interface StudentSettings {
  mathSpanishEnabled: boolean
}

export const DEFAULT_STUDENT_SETTINGS: StudentSettings = {
  mathSpanishEnabled: false,
}

export async function getStudentSettings(db: Client, userId: string): Promise<StudentSettings> {
  const result = await db.execute({
    sql: 'SELECT math_spanish_enabled FROM student_settings WHERE user_id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  if (!row) return DEFAULT_STUDENT_SETTINGS
  return {
    mathSpanishEnabled: Number(row.math_spanish_enabled) === 1,
  }
}

export async function setStudentSettings(db: Client, userId: string, settings: StudentSettings): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO student_settings (user_id, math_spanish_enabled, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        math_spanish_enabled = excluded.math_spanish_enabled,
        updated_at = excluded.updated_at
    `,
    args: [userId, settings.mathSpanishEnabled ? 1 : 0, Date.now()],
  })
}
