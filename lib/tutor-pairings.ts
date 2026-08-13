import type { Client } from '@libsql/client'

export interface TutorPairingRecord {
  studentId: string
  tutorId: string
  sessionDays: number
  lastDate: string
}

export interface TutorPairing {
  tutorId: string
  tutorName: string
  sessionDays: number
  lastDate: string
}

/**
 * Who a student has actually been taught by, most frequent first. Admins assign
 * students week to week, so the useful signal is how many separate session days
 * a tutor has run with that student and how recently.
 */
export function summarizeTutorPairings(
  records: TutorPairingRecord[],
  tutorNameById: ReadonlyMap<string, string>,
): Map<string, TutorPairing[]> {
  const byStudent = new Map<string, TutorPairing[]>()

  for (const record of records) {
    if (record.sessionDays <= 0) continue
    const pairings = byStudent.get(record.studentId) ?? []
    pairings.push({
      tutorId: record.tutorId,
      tutorName: tutorNameById.get(record.tutorId) ?? 'Former tutor',
      sessionDays: record.sessionDays,
      lastDate: record.lastDate,
    })
    byStudent.set(record.studentId, pairings)
  }

  for (const pairings of byStudent.values()) {
    pairings.sort((a, b) => (
      b.sessionDays - a.sessionDays
      || b.lastDate.localeCompare(a.lastDate)
      || a.tutorName.localeCompare(b.tutorName)
    ))
  }

  return byStudent
}

export async function loadTutorPairingRecords(db: Client): Promise<TutorPairingRecord[]> {
  const result = await db.execute({
    sql: `
      SELECT student_id, tutor_id, COUNT(DISTINCT date) AS session_days, MAX(date) AS last_date
      FROM sessions
      GROUP BY student_id, tutor_id
    `,
    args: [],
  })
  return result.rows.map(row => ({
    studentId: String(row.student_id),
    tutorId: String(row.tutor_id),
    sessionDays: Number(row.session_days),
    lastDate: String(row.last_date),
  }))
}
