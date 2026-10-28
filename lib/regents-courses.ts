import type { Client, InStatement } from '@libsql/client'
import type { Track } from '@/types'
import type { HighSchoolGradeLevel } from './grade-levels'

export const REGENTS_COURSE_OPTIONS = [
  { id: 'algebra-i', label: 'Algebra I', subject: 'math' },
  { id: 'geometry', label: 'Geometry', subject: 'math' },
  { id: 'algebra-ii', label: 'Algebra II', subject: 'math' },
  { id: 'english', label: 'English Language Arts', subject: 'ela' },
] as const

export type RegentsCourse = typeof REGENTS_COURSE_OPTIONS[number]['id']
export type RegentsSubject = 'math' | 'ela'

export const STUDENT_REGENTS_COURSES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS student_regents_courses (
    user_id TEXT NOT NULL,
    course TEXT NOT NULL CHECK(course IN ('algebra-i', 'geometry', 'algebra-ii', 'english')),
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, course)
  )
`

const COURSE_IDS = new Set<string>(REGENTS_COURSE_OPTIONS.map(option => option.id))

export function isRegentsCourse(value: unknown): value is RegentsCourse {
  return typeof value === 'string' && COURSE_IDS.has(value)
}

export function normalizeRegentsCourses(value: unknown): RegentsCourse[] | null {
  if (!Array.isArray(value) || !value.every(isRegentsCourse)) return null
  const selected = new Set<RegentsCourse>(value)
  return REGENTS_COURSE_OPTIONS.flatMap(option => selected.has(option.id) ? [option.id] : [])
}

export function regentsCourseSubject(course: RegentsCourse): RegentsSubject {
  return course === 'english' ? 'ela' : 'math'
}

export function regentsCoursesMatchPlacement(
  courses: readonly RegentsCourse[],
  tracks: readonly Track[],
  highSchoolGradeLevel: HighSchoolGradeLevel | null,
): boolean {
  return courses.length === 0 || (
    highSchoolGradeLevel !== null
    && courses.every(course => tracks.includes(regentsCourseSubject(course)))
  )
}

export async function getStudentRegentsCourses(db: Client, userId: string): Promise<RegentsCourse[]> {
  const result = await db.execute({
    sql: `SELECT courses.course FROM student_regents_courses AS courses
      INNER JOIN student_settings AS settings ON settings.user_id = courses.user_id
      WHERE courses.user_id = ?
        AND settings.grade_level IS NULL
        AND settings.high_school_grade_level BETWEEN 9 AND 12`,
    args: [userId],
  })
  const selected = new Set(result.rows.map(row => String(row.course)))
  return REGENTS_COURSE_OPTIONS.flatMap(option => selected.has(option.id) ? [option.id] : [])
}

export function regentsCourseAssignmentStatements(
  userId: string,
  courses: readonly RegentsCourse[],
  now: number = Date.now(),
): InStatement[] {
  const selected = new Set(courses)
  return [
    { sql: 'DELETE FROM student_regents_courses WHERE user_id = ?', args: [userId] },
    ...REGENTS_COURSE_OPTIONS.filter(option => selected.has(option.id)).map(option => ({
      sql: 'INSERT INTO student_regents_courses (user_id, course, assigned_at) VALUES (?, ?, ?)',
      args: [userId, option.id, now],
    })),
  ]
}

export async function replaceStudentRegentsCourses(
  db: Client,
  userId: string,
  courses: readonly RegentsCourse[],
): Promise<void> {
  await db.batch(regentsCourseAssignmentStatements(userId, courses), 'write')
}
