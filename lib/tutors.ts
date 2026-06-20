import type { Client } from '@libsql/client'

export async function getStudentTutorIds(db: Client, studentId: string): Promise<string[]> {
  const result = await db.execute({
    sql: 'SELECT tutor_id FROM student_tutors WHERE student_id = ? ORDER BY created_at, tutor_id',
    args: [studentId],
  })
  return result.rows.map(row => String(row.tutor_id))
}

export async function setStudentTutorIds(db: Client, studentId: string, tutorIds: string[]): Promise<void> {
  const uniqueTutorIds = [...new Set(tutorIds.filter(Boolean))]
  const now = Date.now()
  await db.batch([
    { sql: 'DELETE FROM student_tutors WHERE student_id = ?', args: [studentId] },
    ...uniqueTutorIds.map(tutorId => ({
      sql: 'INSERT INTO student_tutors (student_id, tutor_id, created_at) VALUES (?, ?, ?)',
      args: [studentId, tutorId, now],
    })),
  ], 'write')
}
