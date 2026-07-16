import type { Client } from '@libsql/client'
import { normalizeGradeLevel } from './grade-levels'
import type { GradeLevel } from '@/types'

export interface StudentSettings {
  mathSpanishEnabled: boolean
  gradeLevel: GradeLevel | null
}

export const DEFAULT_STUDENT_SETTINGS: StudentSettings = {
  mathSpanishEnabled: false,
  gradeLevel: null,
}

export async function getStudentSettings(db: Client, userId: string): Promise<StudentSettings> {
  const result = await db.execute({
    sql: 'SELECT math_spanish_enabled, grade_level FROM student_settings WHERE user_id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  if (!row) return DEFAULT_STUDENT_SETTINGS
  return {
    mathSpanishEnabled: Number(row.math_spanish_enabled) === 1,
    gradeLevel: normalizeGradeLevel(Number(row.grade_level)),
  }
}

export async function setStudentSettings(db: Client, userId: string, settings: StudentSettings): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO student_settings (user_id, math_spanish_enabled, grade_level, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        math_spanish_enabled = excluded.math_spanish_enabled,
        grade_level = excluded.grade_level,
        updated_at = excluded.updated_at
    `,
    args: [userId, settings.mathSpanishEnabled ? 1 : 0, settings.gradeLevel, Date.now()],
  })
}
