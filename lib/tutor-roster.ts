import type { Client } from '@libsql/client'

const TUTOR_ROSTER_SCOPE_COOKIE_PREFIX = 'vine_tutor_roster_scope_'

export type TutorRosterScope = 'assigned' | 'all'

export function isTutorRosterScope(value: unknown): value is TutorRosterScope {
  return value === 'assigned' || value === 'all'
}

export function normalizeTutorRosterScope(value: unknown): TutorRosterScope {
  return isTutorRosterScope(value) ? value : 'assigned'
}

export function tutorRosterScopeCookieName(tutorId: string): string {
  const safeTutorId = tutorId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${TUTOR_ROSTER_SCOPE_COOKIE_PREFIX}${safeTutorId}`
}

export async function getTutorStudentIds(db: Client, tutorId: string): Promise<Set<string>> {
  const result = await db.execute({
    sql: 'SELECT student_id FROM student_tutors WHERE tutor_id = ?',
    args: [tutorId],
  })
  return new Set(result.rows.map(row => String(row.student_id)))
}

export function filterTutorRosterStudents<T extends { id: string }>(
  students: T[],
  assignedStudentIds: ReadonlySet<string>,
  scope: TutorRosterScope,
): T[] {
  if (scope === 'all') return students
  return students.filter(student => assignedStudentIds.has(student.id))
}
