import type { Client } from '@libsql/client'

export interface TutorCheckIn {
  tutorId: string
  tutorName: string
  /** null until somebody actually marks them, which is not the same as absent. */
  present: boolean | null
  recordedAt: number | null
}

export interface StudentCheckIn {
  studentId: string
  studentName: string
  present: boolean | null
  recordedBy: string | null
  recordedByName: string | null
  recordedAt: number | null
}

export interface CheckInDay {
  date: string
  tutors: TutorCheckIn[]
  students: StudentCheckIn[]
}

export function isCheckInDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Present / expected, for the one-line summary an admin scans first. */
export function summarizeCheckInCounts(entries: Array<{ present: boolean | null }>): {
  present: number
  marked: number
  total: number
} {
  return {
    present: entries.filter(entry => entry.present === true).length,
    marked: entries.filter(entry => entry.present !== null).length,
    total: entries.length,
  }
}

export async function setTutorCheckIn(
  db: Client,
  { date, tutorId, present }: { date: string; tutorId: string; present: boolean },
): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO tutor_check_ins (session_date, tutor_id, present, recorded_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_date, tutor_id) DO UPDATE SET
        present = excluded.present,
        recorded_at = excluded.recorded_at
    `,
    args: [date, tutorId, present ? 1 : 0, Date.now()],
  })
}

export async function setStudentCheckIn(
  db: Client,
  {
    date,
    studentId,
    present,
    recordedBy,
  }: { date: string; studentId: string; present: boolean; recordedBy: string },
): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO attendance (session_date, student_id, present, recorded_by, recorded_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_date, student_id) DO UPDATE SET
        present = excluded.present,
        recorded_by = excluded.recorded_by,
        recorded_at = excluded.recorded_at
    `,
    args: [date, studentId, present ? 1 : 0, recordedBy, Date.now()],
  })
}

/**
 * Everything an admin needs for one session date: every tutor with their own
 * check-in, and every student with whichever tutor marked them.
 */
export async function getCheckInDay(db: Client, date: string): Promise<CheckInDay> {
  const [tutorsResult, studentsResult, tutorCheckInsResult, attendanceResult] = await Promise.all([
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'tutor' ORDER BY name", args: [] }),
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'student' ORDER BY name", args: [] }),
    db.execute({
      sql: 'SELECT tutor_id, present, recorded_at FROM tutor_check_ins WHERE session_date = ?',
      args: [date],
    }),
    db.execute({
      sql: 'SELECT student_id, present, recorded_by, recorded_at FROM attendance WHERE session_date = ?',
      args: [date],
    }),
  ])

  const tutorNameById = new Map(tutorsResult.rows.map(row => [String(row.id), String(row.name)]))
  const tutorCheckInById = new Map(tutorCheckInsResult.rows.map(row => [
    String(row.tutor_id),
    { present: Number(row.present) === 1, recordedAt: row.recorded_at === null ? null : Number(row.recorded_at) },
  ]))
  const attendanceByStudent = new Map(attendanceResult.rows.map(row => [
    String(row.student_id),
    {
      present: Number(row.present) === 1,
      recordedBy: row.recorded_by === null ? null : String(row.recorded_by),
      recordedAt: row.recorded_at === null ? null : Number(row.recorded_at),
    },
  ]))

  return {
    date,
    tutors: tutorsResult.rows.map(row => {
      const tutorId = String(row.id)
      const checkIn = tutorCheckInById.get(tutorId)
      return {
        tutorId,
        tutorName: String(row.name),
        present: checkIn ? checkIn.present : null,
        recordedAt: checkIn?.recordedAt ?? null,
      }
    }),
    students: studentsResult.rows.map(row => {
      const studentId = String(row.id)
      const attendance = attendanceByStudent.get(studentId)
      return {
        studentId,
        studentName: String(row.name),
        present: attendance ? attendance.present : null,
        recordedBy: attendance?.recordedBy ?? null,
        recordedByName: attendance?.recordedBy ? tutorNameById.get(attendance.recordedBy) ?? 'Unknown' : null,
        recordedAt: attendance?.recordedAt ?? null,
      }
    }),
  }
}
